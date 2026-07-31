const fs = require('fs');
const path = require('path');
const dir = 'd:/DAPD/src/screens/main';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => path.join(dir, f));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let hasChange = false;
  
  if (content.includes('fontSize: 36>≡</Text>')) {
    if (f.includes('VerificationScreen')) {
      content = content.replace(/<Text style={{ fontSize: 36>≡<\/Text>/g, `<Text style={{ fontSize: 36, color: '#1C2942' }}>≡</Text>`);
    } else {
      content = content.replace(/<Text style={{ fontSize: 36>≡<\/Text>/g, `<Text style={{ fontSize: 36, color: COLORS.primary }}>≡</Text>`);
    }
    hasChange = true;
  }
  
  if (hasChange) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
