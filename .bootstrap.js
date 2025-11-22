#!/usr/bin/env bun
/**
 * Auto-generated bootstrap script
 * Runs once after git clone to setup project correctly
 * This file will self-delete after successful execution
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT_NAME = "liminal-zero-4un6j39zrtd6j6yyfu7yi";
const BOOTSTRAP_MARKER = '.bootstrap-complete';

// Check if already bootstrapped
if (fs.existsSync(BOOTSTRAP_MARKER)) {
    console.log('✓ Bootstrap already completed');
    process.exit(0);
}

console.log('🚀 Running first-time project setup...\n');

try {
    // Update package.json
    updatePackageJson();
    
    // Update wrangler.jsonc if exists
    updateWranglerJsonc();
    
    // Run setup commands
    runSetupCommands();
    
    // Mark as complete
    fs.writeFileSync(BOOTSTRAP_MARKER, new Date().toISOString());
    
    // Self-delete
    fs.unlinkSync(__filename);
    
    console.log('\n✅ Bootstrap complete! Project ready.');
} catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    console.log('You may need to manually update package.json and wrangler.jsonc');
    process.exit(1);
}

function updatePackageJson() {
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.name = PROJECT_NAME;
        
        // Remove prepare script after bootstrap
        if (pkg.scripts && pkg.scripts.prepare) {
            delete pkg.scripts.prepare;
        }
        
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✓ Updated package.json with project name: ' + PROJECT_NAME);
    } catch (error) {
        console.error('Failed to update package.json:', error.message);
        throw error;
    }
}

function updateWranglerJsonc() {
    if (!fs.existsSync('wrangler.jsonc')) {
        console.log('⊘ wrangler.jsonc not found, skipping');
        return;
    }
    
    try {
        let content = fs.readFileSync('wrangler.jsonc', 'utf8');
        content = content.replace(/"name"\s*:\s*"[^"]*"/, `"name": "${PROJECT_NAME}"`);
        fs.writeFileSync('wrangler.jsonc', content);
        console.log('✓ Updated wrangler.jsonc with project name: ' + PROJECT_NAME);
    } catch (error) {
        console.warn('⚠️  Failed to update wrangler.jsonc:', error.message);
    }
}

function runSetupCommands() {
    const commands = [
    "bun add react@^18.3.1",
    "bun add react-dom@^18.3.1",
    "bun add @types/react@^18.3.12 -d",
    "bun add @types/react-dom@^18.3.1 -d",
    "bun add three@^0.165.0",
    "bun add framer-motion@^10.18.0",
    "bun add lucide-react@^0.263.1",
    "bun add clsx@^2.1.1",
    "bun add tailwind-merge@^2.5.2",
    "bun add @radix-ui/react-slot@^1.1.0",
    "bun add @radix-ui/react-dialog@^1.1.1",
    "bun add @radix-ui/react-slider@^1.2.0",
    "bun add tailwindcss@^3.4.0 -d",
    "bun install react react-dom three framer-motion lucide-react clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-slider",
    "bun install -d vite @vitejs/plugin-react tailwindcss postcss autoprefixer @types/react @types/react-dom @types/three",
    "bun install path",
    "bun add url",
    "bun add -d @types/node"
];
    
    if (commands.length === 0) {
        console.log('⊘ No setup commands to run');
        return;
    }
    
    console.log('\n📦 Running setup commands...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const cmd of commands) {
        console.log(`▸ ${cmd}`);
        try {
            execSync(cmd, { 
                stdio: 'inherit',
                cwd: process.cwd()
            });
            successCount++;
        } catch (error) {
            failCount++;
            console.warn(`⚠️  Command failed: ${cmd}`);
            console.warn(`   Error: ${error.message}`);
        }
    }
    
    console.log(`\n✓ Commands completed: ${successCount} successful, ${failCount} failed\n`);
}
