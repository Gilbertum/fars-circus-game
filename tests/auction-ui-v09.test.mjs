import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {renderAuctionControls,activeAuctionIndex,selectedAuctionTitle} from '../auction-ui.mjs';

const samples=[
 {title:'Pikuniku',goal:'Пройти основную историю',time:'≈ 3 часа'},
 {title:'Duck Detective: The Secret Salami',goal:'Раскрыть дело',time:'≈ 2–3 часа'},
 {title:'Minami Lane',goal:'Пройти игру',time:'≈ 2–4 часа'}
];
test('auction uses exactly three accessible, selectable illustrated games',()=>{
 const html=renderAuctionControls(samples,10);
 assert.equal((html.match(/class="fars-auction-card /g)||[]).length,3);
 assert.equal((html.match(/type="radio"/g)||[]).length,3);
 assert.match(html,/name="auction-pick"/);
 assert.match(html,/fieldset/);
 assert.match(html,/legend/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/data-action="auction-pick"/);
 for(const sample of samples)assert.ok(html.includes(sample.title));
 assert.match(html,/Аукцион № 2/);
 assert.match(html,/Победившая игра аукциона/);
 assert.match(html,/Ставки принимаются вне сайта/);
});

test('the first enabled option is checked; empty choices cannot win',()=>{
 const html=renderAuctionControls([{title:''},...samples.slice(1)],6);
 assert.equal(activeAuctionIndex([{title:''},...samples.slice(1)]),1);
 assert.match(html,/value="0"[^>]*disabled/);
 assert.match(html,/value="1"[^>]*checked/);
 assert.match(html,/Выбрано: Duck Detective/);
 assert.equal(selectedAuctionTitle(samples,2),'Minami Lane');
});

test('auction escapes untrusted saved titles, goals and durations',()=>{
 const html=renderAuctionControls([{title:'<img src=x onerror=alert(1)>',goal:'<script>oops</script>',time:'"> 7 h'}],15);
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img src=x'));
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&quot;&gt; 7 h/);
 assert.match(html,/Аукцион № 3/);
});

test('no valid games disable winner confirmation safely',()=>{
 const html=renderAuctionControls([{title:''},{title:'  '}],6);
 assert.match(html,/Нет доступных игр для выбора/);
 assert.match(html,/data-action="auction-pick" disabled/);
 assert.equal((html.match(/\bchecked\b/g)||[]).length,0);
});

test('all auction stage images already exist and v0.9 stylesheet loads last',()=>{
 for(const path of ['assets/arena-thumb.webp','assets/backstage-thumb.webp','assets/carpet-thumb.webp','assets/ui-v07/auction-blank.png']){
   assert.ok(existsSync(path), 'missing '+path);
 }
 const css=readFileSync('theme-fars-v09.css','utf8');
 const html=readFileSync('index.html','utf8');
 const app=readFileSync('app.mjs','utf8');
 assert.match(css,/scene-0/);
 assert.match(css,/scene-1/);
 assert.match(css,/scene-2/);
 assert.ok(html.indexOf('theme-fars-v081.css')<html.indexOf('theme-fars-v09.css'));
 assert.ok(app.includes("import {renderAuctionControls,selectedAuctionTitle}"));
 assert.ok(app.includes("action.innerHTML=renderAuctionControls"));
 assert.ok(app.includes("hint.textContent='Выбрано: '+title"));
});
