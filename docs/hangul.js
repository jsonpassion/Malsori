/* Hangul pronunciation — the same engine the app runs on a card, ported for the page.
   Korean is written one way and spoken another (할아버지 → 하라버지), and only the rules that
   apply automatically are implemented; the ones that need to know the word's grammar are left
   out, because a wrong reading teaches a visitor an error. */
(function (global) {
  'use strict';

  var BASE = 0xAC00, LAST = 0xD7A3;
  var INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var MEDIALS  = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var FINALS   = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  var LINK = {1:[0,0],2:[0,1],3:[1,9],4:[0,2],5:[4,12],6:[4,18],7:[0,3],8:[0,5],9:[8,0],10:[8,6],
              11:[8,7],12:[8,9],13:[8,16],14:[8,17],15:[8,18],16:[0,6],17:[0,7],18:[17,9],19:[0,9],
              20:[0,10],22:[0,12],23:[0,14],24:[0,15],25:[0,16],26:[0,17]};
  var NEUTRAL = {1:1,2:1,3:1,9:1,24:1,4:4,5:4,6:4,7:7,19:7,20:7,22:7,23:7,25:7,27:7,
                 8:8,11:8,12:8,13:8,15:8,10:16,16:16,14:17,17:17,18:17,26:17,21:21};
  var TENSE = {0:1,3:4,7:8,9:10,12:13};
  var ASPIRATE = {0:15,3:16,12:14,9:10};
  var NASAL = {1:21,7:4,17:16};
  var H_MERGE = {1:[0,15],9:[8,15],7:[0,16],17:[0,17],11:[8,17],22:[0,14],5:[4,14]};

  var RULES = {
    linking:        {title: 'Linking',         detail: 'The final consonant moves onto the vowel that follows.'},
    aspiration:     {title: 'Aspiration',      detail: 'ㄱ, ㄷ, ㅂ and ㅈ meet ㅎ and come out as rough sounds.'},
    hDeletion:      {title: 'H dropped',       detail: 'ㅎ is silent before a vowel.'},
    palatalization: {title: 'Palatalization',  detail: 'A ㄷ or ㅌ final turns into ㅈ or ㅊ before 이.'},
    neutralization: {title: 'Final consonant', detail: 'A final consonant is only ever read as one of seven sounds.'},
    nasalization:   {title: 'Nasalization',    detail: 'ㄱ, ㄷ and ㅂ become ㅇ, ㄴ and ㅁ before a nasal.'},
    lateralization: {title: 'Lateralization',  detail: 'When ㄴ meets ㄹ, both are read as ㄹ.'},
    tensification:  {title: 'Tensification',   detail: 'The sound after a final consonant tightens.'}
  };
  var ORDER = ['linking','aspiration','hDeletion','palatalization','neutralization','nasalization','lateralization','tensification'];

  function decompose(ch) {
    var code = ch.charCodeAt(0);
    if (code < BASE || code > LAST) return null;
    var i = code - BASE;
    return {initial: Math.floor(i / (21 * 28)), medial: Math.floor((i % (21 * 28)) / 28), final: i % 28};
  }
  function compose(s) {
    return String.fromCharCode(BASE + s.initial * 21 * 28 + s.medial * 28 + s.final);
  }

  function pronounceWord(word) {
    var syllables = [], slots = [], passthrough = {}, fired = {};
    for (var n = 0; n < word.length; n++) {
      var s = decompose(word[n]);
      if (s) { slots.push(syllables.length); syllables.push(s); }
      else { slots.push(null); passthrough[n] = word[n]; }
    }
    if (!syllables.length) return {text: word, changes: []};
    var spelledFinals = syllables.map(function (s) { return s.final; });
    var i, f, next;

    // 1. ㅎ fuses with a neighbouring stop, in either order.
    for (i = 0; i < syllables.length - 1; i++) {
      f = syllables[i].final; next = syllables[i + 1].initial;
      if (f === 27 || f === 6 || f === 15) {
        if (ASPIRATE[next] !== undefined) {
          syllables[i].final = f === 27 ? 0 : (f === 6 ? 4 : 8);
          syllables[i + 1].initial = ASPIRATE[next];
          fired.aspiration = true;
        } else if (next === 11) {
          syllables[i].final = f === 27 ? 0 : (f === 6 ? 4 : 8);
          fired.hDeletion = true;
        }
      } else if (next === 18 && H_MERGE[f]) {
        syllables[i].final = H_MERGE[f][0];
        syllables[i + 1].initial = H_MERGE[f][1];
        fired.aspiration = true;
      }
    }
    // 2. 구개음화
    for (i = 0; i < syllables.length - 1; i++) {
      next = syllables[i + 1];
      if (next.initial !== 11 || next.medial !== 20) continue;
      if (syllables[i].final === 7) { syllables[i].final = 0; next.initial = 12; fired.palatalization = true; }
      else if (syllables[i].final === 25) { syllables[i].final = 0; next.initial = 14; fired.palatalization = true; }
    }
    // 3. 연음
    for (i = 0; i < syllables.length - 1; i++) {
      f = syllables[i].final;
      if (syllables[i + 1].initial !== 11 || f === 0 || f === 21 || !LINK[f]) continue;
      syllables[i].final = LINK[f][0];
      syllables[i + 1].initial = LINK[f][1];
      fired.linking = true;
    }
    // 4. 받침 중화
    for (i = 0; i < syllables.length; i++) {
      f = syllables[i].final;
      if (f === 0 || NEUTRAL[f] === undefined || NEUTRAL[f] === f) continue;
      syllables[i].final = NEUTRAL[f];
      fired.neutralization = true;
    }
    // 5. 유음화
    for (i = 0; i < syllables.length - 1; i++) {
      if (syllables[i].final === 4 && syllables[i + 1].initial === 5) { syllables[i].final = 8; fired.lateralization = true; }
      else if (syllables[i].final === 8 && syllables[i + 1].initial === 2) { syllables[i + 1].initial = 5; fired.lateralization = true; }
    }
    // 6. 비음화
    for (i = 0; i < syllables.length - 1; i++) {
      f = syllables[i].final; next = syllables[i + 1].initial;
      if (next === 5 && (f === 1 || f === 17 || f === 16 || f === 21)) { syllables[i + 1].initial = 2; fired.nasalization = true; }
      var following = syllables[i + 1].initial;
      if ((following === 2 || following === 6) && NASAL[syllables[i].final] !== undefined) {
        syllables[i].final = NASAL[syllables[i].final];
        fired.nasalization = true;
      }
    }
    // 7. 경음화 — ㄵ ㄻ ㄼ ㄾ only ever sit in verb stems, so they tighten too.
    for (i = 0; i < syllables.length - 1; i++) {
      var stem = [5, 10, 11, 13].indexOf(spelledFinals[i]) >= 0;
      f = syllables[i].final;
      if (!(f === 1 || f === 7 || f === 17 || stem)) continue;
      if (TENSE[syllables[i + 1].initial] === undefined) continue;
      syllables[i + 1].initial = TENSE[syllables[i + 1].initial];
      fired.tensification = true;
    }

    var out = '', cursor = 0;
    for (i = 0; i < slots.length; i++) {
      if (slots[i] !== null) { out += compose(syllables[cursor]); cursor++; }
      else { out += passthrough[i]; }
    }
    return {text: out, changes: ORDER.filter(function (k) { return fired[k]; })};
  }

  function pronounce(text) {
    var words = String(text).split(' '), spoken = [], changes = [];
    for (var i = 0; i < words.length; i++) {
      var r = pronounceWord(words[i]);
      spoken.push(r.text);
      r.changes.forEach(function (c) { if (changes.indexOf(c) < 0) changes.push(c); });
    }
    var out = spoken.join(' ');
    return {spelled: text, spoken: out, differs: out !== text, changes: ORDER.filter(function (k) { return changes.indexOf(k) >= 0; })};
  }

  function letters(text) {
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var s = decompose(text[i]);
      if (!s) continue;
      out.push({syllable: text[i], initial: INITIALS[s.initial], medial: MEDIALS[s.medial],
                final: s.final === 0 ? null : FINALS[s.final]});
    }
    return out;
  }

  global.Hangul = {pronounce: pronounce, letters: letters, rules: RULES};
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined') module.exports = globalThis.Hangul;
