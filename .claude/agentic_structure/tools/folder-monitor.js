const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class FolderMonitor {
  constructor(watchPath = '.') {
    this.watchPath = path.resolve(watchPath);
    this.mappingsFile = path.join(this.watchPath, '.folder-mappings.json');
    this.linkMappings = this.loadMappings();
    this.watcher = null;
    
    console.log(`Monitoring folder: ${this.watchPath}`);
  }

  loadMappings() {
    try {
      if (fs.existsSync(this.mappingsFile)) {
        const data = fs.readFileSync(this.mappingsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load existing mappings:', error.message);
    }
    return {
      folders: {},
      files: {},
      lastUpdated: new Date().toISOString()
    };
  }

  saveMappings() {
    try {
      this.linkMappings.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.mappingsFile, JSON.stringify(this.linkMappings, null, 2));
      console.log('Mappings saved successfully');
    } catch (error) {
      console.error('Failed to save mappings:', error.message);
    }
  }

  updateLinksInFiles(oldPath, newPath) {
    const markdownFiles = this.findMarkdownFiles();
    let updatedFiles = 0;

    markdownFiles.forEach(filePath => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Update various link formats
        const patterns = [
          // Markdown links
          new RegExp(`\\[([^\\]]*)\\]\\(${this.escapeRegex(oldPath)}([^)]*)\\)`, 'g'),
          // File:// links
          new RegExp(`file://${this.escapeRegex(oldPath)}`, 'g'),
          // Relative path references
          new RegExp(`\\./${this.escapeRegex(path.basename(oldPath))}`, 'g'),
          // Absolute path references
          new RegExp(this.escapeRegex(oldPath), 'g')
        ];

        patterns.forEach(pattern => {
          content = content.replace(pattern, (match, ...groups) => {
            if (groups[0] !== undefined) {
              // Markdown link format
              return `[${groups[0]}](${newPath}${groups[1] || ''})`;
            } else if (match.startsWith('file://')) {
              return `file://${newPath}`;
            } else if (match.startsWith('./')) {
              return `./${path.basename(newPath)}`;
            } else {
              return newPath;
            }
          });
        });

        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          updatedFiles++;
          console.log(`Updated links in: ${path.relative(this.watchPath, filePath)}`);
        }
      } catch (error) {
        console.error(`Failed to update links in ${filePath}:`, error.message);
      }
    });

    if (updatedFiles > 0) {
      console.log(`Successfully updated links in ${updatedFiles} files`);
    }
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  findMarkdownFiles() {
    const files = [];
    const walkDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (path.extname(fullPath).toLowerCase() === '.md') {
            files.push(fullPath);
          }
        });
      } catch (error) {
        console.warn(`Could not read directory ${dir}:`, error.message);
      }
    };
    walkDir(this.watchPath);
    return files;
  }

  handleFileChange(eventType, filePath) {
    const relativePath = path.relative(this.watchPath, filePath);
    console.log(`${eventType}: ${relativePath}`);

    switch (eventType) {
      case 'add':
      case 'addDir':
        this.linkMappings.folders[relativePath] = {
          created: new Date().toISOString(),
          currentPath: relativePath
        };
        break;
      
      case 'unlink':
      case 'unlinkDir':
        // Check if this was a move operation (file will be added elsewhere)
        setTimeout(() => {
          if (this.linkMappings.folders[relativePath]) {
            console.log(`Folder/file deleted: ${relativePath}`);
            delete this.linkMappings.folders[relativePath];
          }
        }, 1000);
        break;
    }
    
    this.saveMappings();
  }

  detectMoveOperation() {
    // This method detects potential move operations by comparing
    // file creation times and content hashes
    const currentFolders = Object.keys(this.linkMappings.folders);
    
    // Implementation would go here for more sophisticated move detection
    // For now, we rely on the file system events
  }

  start() {
    console.log('Starting folder monitor...');
    
    this.watcher = chokidar.watch(this.watchPath, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        this.mappingsFile,
        '**/.*' // Ignore hidden files except our mappings file
      ],
      persistent: true,
      ignoreInitial: false
    });

    this.watcher
      .on('add', path => this.handleFileChange('add', path))
      .on('addDir', path => this.handleFileChange('addDir', path))
      .on('change', path => this.handleFileChange('change', path))
      .on('unlink', path => this.handleFileChange('unlink', path))
      .on('unlinkDir', path => this.handleFileChange('unlinkDir', path))
      .on('ready', () => console.log('Initial scan complete. Watching for changes...'))
      .on('error', error => console.error('Watcher error:', error));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down folder monitor...');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('Folder monitor stopped');
    }
  }

  // Manual method to update links when you know a folder was renamed
  updateLinksManually(oldFolderName, newFolderName) {
    console.log(`Manually updating links from "${oldFolderName}" to "${newFolderName}"`);
    this.updateLinksInFiles(oldFolderName, newFolderName);
    
    // Update our mappings
    Object.keys(this.linkMappings.folders).forEach(key => {
      if (key.includes(oldFolderName)) {
        const newKey = key.replace(oldFolderName, newFolderName);
        this.linkMappings.folders[newKey] = this.linkMappings.folders[key];
        this.linkMappings.folders[newKey].currentPath = newKey;
        this.linkMappings.folders[newKey].previousPath = key;
        this.linkMappings.folders[newKey].updated = new Date().toISOString();
        delete this.linkMappings.folders[key];
      }
    });
    
    this.saveMappings();
  }

  // Get current mappings status
  getStatus() {
    console.log('\n=== Folder Monitor Status ===');
    console.log(`Watching: ${this.watchPath}`);
    console.log(`Tracked folders: ${Object.keys(this.linkMappings.folders).length}`);
    console.log(`Last updated: ${this.linkMappings.lastUpdated}`);
    console.log('\nTracked folders:');
    Object.entries(this.linkMappings.folders).forEach(([path, info]) => {
      console.log(`  ${path} (created: ${info.created})`);
    });
  }
}

// Export for use as a module
module.exports = FolderMonitor;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const monitor = new FolderMonitor('.');
  
  switch (command) {
    case 'start':
      monitor.start();
      break;
      
    case 'status':
      monitor.getStatus();
      break;
      
    case 'update':
      if (args.length < 3) {
        console.error('Usage: node folder-monitor.js update <old-name> <new-name>');
        process.exit(1);
      }
      monitor.updateLinksManually(args[1], args[2]);
      break;
      
    default:
      console.log('Usage:');
      console.log('  node folder-monitor.js start    - Start monitoring');
      console.log('  node folder-monitor.js status   - Show current status');
      console.log('  node folder-monitor.js update <old-name> <new-name> - Manually update links');
      process.exit(1);
  }
}