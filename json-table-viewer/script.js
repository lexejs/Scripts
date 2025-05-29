document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const fileInput2 = document.getElementById('fileInput2');
  const headersRow = document.getElementById('headers');
  const tableBody = document.getElementById('tableBody');
  const otherDataDiv1 = document.getElementById('otherData1');
  const otherDataDiv2 = document.getElementById('otherData2');
  const compareBtn = document.getElementById('compareJson');

  let primaryData = null;
  let secondaryData = null;
  let mergedRows = [];
  let sortColumn = null;
  let sortDir = 1;

  fileInput.addEventListener('change', handlePrimary);
  fileInput2.addEventListener('change', handleSecondary);
  compareBtn.addEventListener('click', () => fileInput2.click());

  function handlePrimary(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const j = JSON.parse(reader.result);
        const items = j.forms || j.FormItems;
        if (!items) { alert('Invalid JSON: expected "forms" or "FormItems"'); return; }
        primaryData = items;
        showOtherData1(j, [j.forms ? 'forms':'FormItems'], f.name);
        secondaryData = null;
        otherDataDiv2.innerHTML = '';
        render();
      } catch (err) { alert('Invalid JSON: '+err.message); }
    };
    reader.readAsText(f);
  }

  function handleSecondary(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const j = JSON.parse(reader.result);
        const items = j.forms || j.FormItems;
        if (!items) { alert('Invalid JSON: expected "forms" or "FormItems"'); return; }
        if (!primaryData) { alert('Load first JSON before comparing'); return; }
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
    sortColumn = null;
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

  function showOtherData1(obj, exclude, filename) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv1.innerHTML = '<h3>Additional Data - ' + filename + '</h3><pre>' + JSON.stringify(copy, null, 2) + '</pre>';
  }

  function showOtherData2(obj, exclude, filename) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv2.innerHTML = '<h3>Additional Data - ' + filename + '</h3><pre>' + JSON.stringify(copy, null, 2) + '</pre>';
  }

  function clearOtherData() { otherDataDiv1.innerHTML = ''; otherDataDiv2.innerHTML = ''; }

  // init: no initial load
});
