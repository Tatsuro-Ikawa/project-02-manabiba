import fs from 'fs';

const path = 'src/app/trial_4w/landing/page.tsx';
let s = fs.readFileSync(path, 'utf8');
s = s.replaceAll('</motion>', '</div>');
s = s.replaceAll('<' + 'motion', '<' + 'div');
fs.writeFileSync(path, s, 'utf8');
console.log('fixed');
