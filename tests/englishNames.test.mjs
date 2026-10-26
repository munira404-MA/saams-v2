import test from 'node:test';
import assert from 'node:assert/strict';
import {toEnglishDisplay} from '../src/utils/globalI18n.js';

test('short Arabic words are not replaced inside names',()=>{
 assert.equal(toEnglishDisplay('منيرة عبدالله الأحمد'),'Munira Abdullah Alahmed');
 for(const name of ['حمدان المنصوري','فاطمة المنهالي','صفية النقبي','فتحية الحمادي']){
  const out=toEnglishDisplay(name);
  assert.doesNotMatch(out,/From|Row|Open|View|Cash|Transfer/,`${name} → ${out}`);
 }
});
test('whole-word labels still translate',()=>{
 assert.equal(toEnglishDisplay('من'),'From');
 assert.equal(toEnglishDisplay('نقل أصل'),'Transfer Asset');
 assert.equal(toEnglishDisplay('الكل'),'All');
});
