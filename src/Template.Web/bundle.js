const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'bundleconfig.json');
if (!fs.existsSync(configPath)) {
    console.error('bundleconfig.json not found');
    process.exit(1);
}

const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));

for (const config of configs) {
    const output = config.outputFileName;
    const inputs = config.inputFiles;
    
    console.log(`Bundling into ${output}...`);
    let content = '';
    for (const input of inputs) {
        const inputPath = path.join(__dirname, input);
        if (fs.existsSync(inputPath)) {
            content += fs.readFileSync(inputPath, 'utf8') + '\n';
        } else {
            console.warn(`File not found: ${inputPath}`);
        }
    }
    
    const dir = path.dirname(path.join(__dirname, output));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(__dirname, output), content, 'utf8');
    
    if (output.endsWith('.css')) {
        const minOutput = output.replace(/\.css$/, '.min.css');
        fs.writeFileSync(path.join(__dirname, minOutput), content, 'utf8');
    }
    if (output.endsWith('.js')) {
        const minOutput = output.replace(/\.js$/, '.min.js');
        fs.writeFileSync(path.join(__dirname, minOutput), content, 'utf8');
    }
}
console.log('Bundling complete!');
