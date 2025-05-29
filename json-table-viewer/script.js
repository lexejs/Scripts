document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const fileInput2 = document.getElementById('fileInput2');
  const headersRow = document.getElementById('headers');
  const tableBody = document.getElementById('tableBody');
  const otherDataDiv1 = document.getElementById('otherData1');
  const otherDataDiv2 = document.getElementById('otherData2');
  let primaryData = null;
  let secondaryData = null;
  let mergedRows = [];
  let sortColumn = null;
  let sortDir = 1;
  let useFields = false;
  let primaryForm = null;
  let secondaryForm = null;
  let compareFieldsRows = [];

  fileInput.addEventListener('change', handlePrimary);
  fileInput2.addEventListener('change', handleSecondary);

  // drag-and-drop support for primary JSON
  const dropZone = document.getElementById('primaryDropZone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
  dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('hover'); });
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('hover');
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      handlePrimary({ target: { files } });
    }
  });

  // drag-and-drop for secondary JSON
  const secondaryDropZone = document.getElementById('secondaryDropZone');
  secondaryDropZone.addEventListener('dragover', e => { e.preventDefault(); secondaryDropZone.classList.add('hover'); });
  secondaryDropZone.addEventListener('dragleave', () => { secondaryDropZone.classList.remove('hover'); });
  secondaryDropZone.addEventListener('drop', e => {
    e.preventDefault(); secondaryDropZone.classList.remove('hover');
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput2.files = files;
      handleSecondary({ target: { files } });
    }
  });

  function handlePrimary(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      // show secondary drop-zone
      secondaryDropZone.style.display = 'block';
      const j = JSON.parse(reader.result);
      if (j.forms && Array.isArray(j.forms)) {
        primaryForm = j.forms[0]; secondaryForm = null;
        useFields = true;
        primaryData = primaryForm.fields || [];
        showOtherData1(primaryForm, ['fields'], f.name);
        otherDataDiv2.innerHTML = '';
        render();
        return;
      }
      const items = j.forms || j.FormItems;
      if (!items) { alert('Invalid JSON: expected "forms" or "FormItems"'); return; }
      primaryForm = null; useFields = false;
      primaryData = items;
      showOtherData1(j, [j.forms ? 'forms':'FormItems'], f.name);
      secondaryData = null;
      otherDataDiv2.innerHTML = '';
      render();
    };
    reader.readAsText(f);
  }

  function handleSecondary(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const j = JSON.parse(reader.result);
        if (useFields && j.forms && Array.isArray(j.forms)) {
          secondaryForm = j.forms[0];
          secondaryData = secondaryForm.fields || [];
          showOtherData2(secondaryForm, ['fields'], f.name);
          compareFieldsAndRender();
          return;
        }
        const items = j.forms || j.FormItems;
        if (!items) { alert('Invalid JSON: expected "forms" or "FormItems"'); return; }
        if (!primaryData) { alert('Load first JSON before comparing'); return; }
        secondaryForm = null;
        secondaryData = items;
        showOtherData2(j, [j.forms ? 'forms':'FormItems'], f.name);
        compareAndRender();
      } catch (err) { alert('Invalid JSON: '+err.message); }
    };
    reader.readAsText(f);
  }

  function compareAndRender() {
    const map1 = {};
    primaryData.forEach(item => { map1[item.Key] = item; });
    const map2 = {};
    secondaryData.forEach(item => { map2[item.Key] = item; });
    const allKeys = Array.from(new Set([...Object.keys(map1), ...Object.keys(map2)]));
    mergedRows = allKeys.map((key, idx) => {
      const a = map1[key] || {};
      const b = map2[key] || {};
      return {
        row: idx+1,
        Key: key,
        RowIndex1: a.RowIndex || '',
        Value1: a.Value || '',
        RowIndex2: b.RowIndex || '',
        Value2: b.Value || ''
      };
    });
    // default sort: bring differing rows to top
    mergedRows.sort((a,b) => {
      const diffA = a.Value1 !== a.Value2;
      const diffB = b.Value1 !== b.Value2;
      if (diffA && !diffB) return -1;
      if (!diffA && diffB) return 1;
      return 0;
    });
    sortColumn = null;
    // update secondary toggle with diff count and background
    const diffSpan2 = document.getElementById('secondaryToggleDiff');
    if (diffSpan2) {
      const count = mergedRows.filter(r => r.Value1 !== r.Value2).length;
      diffSpan2.textContent = count + ' diffs';
      const toggle2 = diffSpan2.parentElement;
      if (count) toggle2.classList.add('diff-present'); else toggle2.classList.remove('diff-present');
    }
    renderMerged();
  }

  function renderMerged() {
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    if (!mergedRows.length) return;
    const keys = ['row','Key','RowIndex1','Value1','RowIndex2','Value2'];
    keys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = k + (sortColumn===k?(sortDir>0?' ↑':' ↓'): '');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sortMerged(k));
      headersRow.appendChild(th);
    });
    mergedRows.forEach(item => {
      const tr = document.createElement('tr');
      keys.forEach(k => {
        const td = document.createElement('td');
        td.textContent = item[k];
        if (k==='Value1' && item.Value1 !== item.Value2) {
          td.classList.add('diff-highlight');
        }
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  function sortMerged(col) {
    if (sortColumn===col) sortDir=-sortDir; else { sortColumn=col; sortDir=1; }
    mergedRows.sort((a,b) => (a[col] > b[col] ? 1 : -1) * sortDir);
    renderMerged();
  }

  function render() {
    if (useFields) return renderFields();
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    if (!primaryData || !primaryData.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'No data';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    const keys = (primaryData[0].Key !== undefined) ? ['Key','RowIndex','Value']
      : Object.keys(primaryData[0]).filter(k=>'fields'!==k);

    const thIndex = document.createElement('th');
    thIndex.textContent = '#';
    headersRow.appendChild(thIndex);
    keys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = k + (sortColumn===k?(sortDir>0?' ↑':' ↓'):'');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sort(k));
      headersRow.appendChild(th);
    });

    primaryData.forEach((item,i)=>{
      const tr = document.createElement('tr');
      tr.insertCell().textContent = i+1;
      keys.forEach(k => {
        tr.insertCell().textContent = format(item[k]);
      });
      tableBody.appendChild(tr);
    });
  }

  function sort(col) {
    if(sortColumn===col)sortDir=-sortDir;else{sortColumn=col;sortDir=1}
    primaryData.sort((a,b)=>(a[col]>b[col]?1:-1)*sortDir);
    render();
  }

  function format(v) {
    if (v===null||v===undefined) return '';
    if (Array.isArray(v)) return v.length+' items';
    if (typeof v==='object') return JSON.stringify(v, null, 2);
    return v;
  }

  function renderFields() {
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    const keys = ['#','name','value'];
    keys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = k + (sortColumn===k?(sortDir>0?' ↑':' ↓'): '');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sortFields(k));
      headersRow.appendChild(th);
    });
    primaryData.forEach((field,i) => {
      const tr = document.createElement('tr');
      tr.insertCell().textContent = i+1;
      tr.insertCell().textContent = field.name;
      tr.insertCell().textContent = field.value;
      tableBody.appendChild(tr);
    });
  }

  function sortFields(col) {
    if (sortColumn===col) sortDir=-sortDir; else { sortColumn=col; sortDir=1; }
    primaryData.sort((a,b,i)=> {
      let va, vb;
      if (col==='#') { va = primaryData.indexOf(a); vb = primaryData.indexOf(b); }
      else { va=a[col]; vb=b[col]; }
      return (va>vb?1:-1)*sortDir;
    });
    renderFields();
  }

  function compareFieldsAndRender() {
    const map1 = {};
    primaryData.forEach(f=>map1[f.name]=f.value);
    const map2 = {};
    secondaryData.forEach(f=>map2[f.name]=f.value);
    const allNames = Array.from(new Set([...Object.keys(map1),...Object.keys(map2)]));
    compareFieldsRows = allNames.map((name,i)=>([i+1,name,map1[name]||'',map2[name]||'']));
    // default sort: differing fields first
    compareFieldsRows.sort((a,b) => {
      const diffA = a[2] !== a[3];
      const diffB = b[2] !== b[3];
      if (diffA && !diffB) return -1;
      if (!diffA && diffB) return 1;
      return 0;
    });
    // update secondary toggle with diff count and background
    const diffSpanF = document.getElementById('secondaryToggleDiff');
    if (diffSpanF) {
      const countF = compareFieldsRows.filter(c => c[2] !== c[3]).length;
      diffSpanF.textContent = countF + ' diffs';
      const toggleF = diffSpanF.parentElement;
      if (countF) toggleF.classList.add('diff-present'); else toggleF.classList.remove('diff-present');
    }
    renderCompareFields();
  }

  function renderCompareFields() {
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    const keys = ['#','name','value1','value2'];
    keys.forEach((k, idx) => {
      const th = document.createElement('th');
      th.textContent = k + (sortColumn===k?(sortDir>0?' ↑':' ↓'): '');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sortCompareFields(k));
      headersRow.appendChild(th);
    });
    compareFieldsRows.forEach(c=>{
      const tr=document.createElement('tr');
      c.forEach((cell,j)=>{
        const td=tr.insertCell(); td.textContent=cell;
        if(j>=2 && c[2]!==c[3]) td.classList.add('diff-highlight');
      });
      tableBody.appendChild(tr);
    });
  }

  function sortCompareFields(col) {
    if(sortColumn===col) sortDir=-sortDir; else { sortColumn=col; sortDir=1; }
    const idx = ['#','name','value1','value2'].indexOf(col);
    compareFieldsRows.sort((a,b)=>{
      const va=a[idx], vb=b[idx];
      return (va>vb?1:-1)*sortDir;
    });
    renderCompareFields();
  }

  function showOtherData1(obj, exclude, filename) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv1.innerHTML = '';
    const toggle = document.createElement('div');
    toggle.textContent = filename + ' (click to toggle details)';
    toggle.classList.add('clickable-title');
    otherDataDiv1.appendChild(toggle);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(copy, null, 2);
    pre.style.display = 'none';
    otherDataDiv1.appendChild(pre);
    toggle.addEventListener('click', () => {
      pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
    });
  }

  function showOtherData2(obj, exclude, filename) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv2.innerHTML = '';
    const toggle = document.createElement('div');
    toggle.id = 'secondaryToggle';
    toggle.classList.add('clickable-title');
    // filename and hint
    const label = document.createElement('span');
    label.textContent = filename + ' (click to toggle details)';
    toggle.appendChild(label);
    // diff count placeholder
    const diffSpan = document.createElement('span');
    diffSpan.id = 'secondaryToggleDiff';
    toggle.appendChild(diffSpan);
    otherDataDiv2.appendChild(toggle);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(copy, null, 2);
    pre.style.display = 'none';
    otherDataDiv2.appendChild(pre);
    toggle.addEventListener('click', () => {
      pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
    });
  }

  function clearOtherData() { otherDataDiv1.innerHTML = ''; otherDataDiv2.innerHTML = ''; }

  // init: no initial load
});
