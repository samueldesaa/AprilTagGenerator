(() => {
  const familySelect = document.querySelector('#family');
  const startInput = document.querySelector('#start-id');
  const endInput = document.querySelector('#end-id');
  const rangeFeedback = document.querySelector('#id-range-help');
  const rangeLabel = document.querySelector('#id-range-label');
  const chips = document.querySelector('#id-chips');
  const grid = document.querySelector('#tag-grid');
  const downloadButton = document.querySelector('#download-all');
  const buttonCount = document.querySelector('#button-count');
  const resolutionSelect = document.querySelector('#resolution');
  const resolutionLabel = document.querySelector('#resolution-label');
  const subtitle = document.querySelector('#preview-subtitle');
  const error = document.querySelector('#error');
  const pagination = document.querySelector('#pagination');
  const previousPage = document.querySelector('#previous-page');
  const nextPage = document.querySelector('#next-page');
  const pageStatus = document.querySelector('#page-status');
  const cache = new Map();
  const PAGE_SIZE = 12;
  let page = 0;
  let renderToken = 0;

  const configNames = { '36h11': '36h11', tag25h9: '25h9', tag16h5: '16h5' };

  function currentRange() {
    return { start: startInput.value === '' ? NaN : Number(startInput.value), end: endInput.value === '' ? NaN : Number(endInput.value) };
  }

  function currentIds() {
    const { start, end } = currentRange();
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return [];
    if (end - start > 9999) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  async function loadFamily(family) {
    if (!window.AprilTagFamily) throw new Error('A biblioteca de geração não carregou. Confira sua conexão e recarregue a página.');
    if (!cache.has(family)) {
      const response = await fetch(`https://cdn.jsdelivr.net/npm/apriltag@2.0.3/families/${configNames[family]}.json`);
      if (!response.ok) throw new Error(`Não foi possível carregar a família ${family}.`);
      cache.set(family, new window.AprilTagFamily(await response.json()));
    }
    return cache.get(family);
  }

  function makePng(family, id, resolution) {
    const matrix = family.render(id);
    if (!matrix || !matrix.length) throw new Error(`Não foi possível gerar o ID ${id}.`);
    const dimension = matrix.length;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, resolution, resolution);
    context.fillStyle = '#000';
    for (let y = 0; y < dimension; y += 1) {
      for (let x = 0; x < dimension; x += 1) {
        if (matrix[y][x] === 'b') {
          const left = Math.round(x * resolution / dimension);
          const top = Math.round(y * resolution / dimension);
          const right = Math.round((x + 1) * resolution / dimension);
          const bottom = Math.round((y + 1) * resolution / dimension);
          context.fillRect(left, top, right - left, bottom - top);
        }
      }
    }
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao criar a imagem PNG.')), 'image/png'));
  }

  function updateLabels(ids) {
    const count = ids.length;
    const { start, end } = currentRange();
    buttonCount.textContent = `${count} PNG${count === 1 ? '' : 's'}`;
    subtitle.textContent = `${count} ${count === 1 ? 'marcador selecionado' : 'marcadores selecionados'}`;
    rangeFeedback.textContent = count ? `${count} ${count === 1 ? 'tag selecionada' : 'tags selecionadas'}` : 'Faixa inválida. Use inteiros e no máximo 10.000 IDs por vez.';
    rangeLabel.textContent = count ? `${start}–${end}` : 'faixa inválida';
    startInput.setAttribute('aria-invalid', String(!Number.isInteger(start) || start < 0));
    endInput.setAttribute('aria-invalid', String(!Number.isInteger(end) || end < start || end - start > 9999));
    const fragment = document.createDocumentFragment();
    ids.slice(0, 12).forEach(id => {
      const chip = document.createElement('span');
      chip.className = 'id-chip inline-flex items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800';
      chip.textContent = String(id);
      fragment.append(chip);
    });
    if (count > 12) {
      const more = document.createElement('span');
      more.className = 'id-chip inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600';
      more.textContent = `+${count - 12} IDs`;
      fragment.append(more);
    }
    chips.replaceChildren(fragment);
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }

  async function render() {
    const token = ++renderToken;
    const ids = currentIds();
    const resolution = Number(resolutionSelect.value);
    updateLabels(ids);
    resolutionLabel.textContent = `${resolution} × ${resolution} px`;
    error.hidden = true;
    grid.setAttribute('aria-busy', 'true');

    if (!ids.length) {
      grid.replaceChildren();
      pagination.hidden = true;
      showError('Informe IDs inteiros a partir de zero e certifique-se de que o último ID não é menor que o primeiro.');
      grid.setAttribute('aria-busy', 'false');
      return;
    }

    pagination.hidden = ids.length <= PAGE_SIZE;
    const pageCount = Math.ceil(ids.length / PAGE_SIZE);
    page = Math.min(page, pageCount - 1);
    const visibleIds = ids.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    pageStatus.textContent = `Página ${page + 1} de ${pageCount} · IDs ${visibleIds[0]}–${visibleIds[visibleIds.length - 1]}`;
    previousPage.disabled = page === 0;
    nextPage.disabled = page >= pageCount - 1;
    const cards = visibleIds.map(id => {
      const card = document.createElement('article');
      card.className = 'tag-card';
      const meta = document.createElement('div');
      meta.className = 'tag-meta';
      const tagId = document.createElement('span');
      tagId.className = 'tag-id';
      tagId.textContent = `ID ${id}`;
      const download = document.createElement('button');
      download.className = 'tag-download';
      download.type = 'button';
      download.setAttribute('aria-label', `Baixar imagem do ID ${id}`);
      download.title = `Baixar PNG do ID ${id}`;
      download.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>';
      meta.append(tagId, download);
      card.append(meta);
      return { id, card, download };
    });
    grid.replaceChildren(...cards.map(item => item.card));
    try {
      const family = await loadFamily(familySelect.value);
      if (token !== renderToken) return;
      const invalidId = visibleIds.find(id => id >= family.codes.length);
      if (invalidId !== undefined) throw new Error(`ID ${invalidId} não existe na família selecionada. ${familySelect.value} aceita IDs de 0 a ${family.codes.length - 1}.`);
      await Promise.all(cards.map(async ({ id, card, download }) => {
        const blob = await makePng(family, id, resolution);
        const image = document.createElement('img');
        image.className = 'tag-image';
        image.width = resolution;
        image.height = resolution;
        image.alt = `Marcador AprilTag ${familySelect.value}, ID ${id}`;
        image.src = URL.createObjectURL(blob);
        card.prepend(image);
        download.addEventListener('click', () => saveBlob(blob, `apriltag-${familySelect.value}-id-${id}.png`));
      }));
    } catch (caught) {
      if (token === renderToken) showError(caught instanceof Error ? caught.message : 'Ocorreu um erro ao gerar os marcadores.');
    } finally {
      if (token === renderToken) grid.setAttribute('aria-busy', 'false');
    }
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAll() {
    downloadButton.disabled = true;
    downloadButton.setAttribute('aria-busy', 'true');
    error.hidden = true;
    try {
      const family = await loadFamily(familySelect.value);
      const ids = currentIds();
      const resolution = Number(resolutionSelect.value);
      const invalidId = ids.find(id => id >= family.codes.length);
      if (invalidId !== undefined) throw new Error(`ID ${invalidId} não existe na família selecionada. ${familySelect.value} aceita IDs de 0 a ${family.codes.length - 1}.`);
      if (!window.JSZip && ids.length > 1) throw new Error('A biblioteca ZIP não carregou. Confira sua conexão e tente novamente.');
      if (ids.length === 1) {
        saveBlob(await makePng(family, ids[0], resolution), `apriltag-${familySelect.value}-id-${ids[0]}.png`);
      } else {
        const zip = new window.JSZip();
        for (const id of ids) zip.file(`apriltag-${familySelect.value}-id-${id}.png`, await makePng(family, id, resolution));
        saveBlob(await zip.generateAsync({ type: 'blob' }), `apriltags-${familySelect.value}-ids-${ids[0]}-${ids[ids.length - 1]}.zip`);
      }
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Ocorreu um erro ao exportar as imagens.');
    } finally {
      downloadButton.disabled = false;
      downloadButton.removeAttribute('aria-busy');
    }
  }

  function changeRange() { page = 0; render(); }
  startInput.addEventListener('input', changeRange);
  endInput.addEventListener('input', changeRange);
  familySelect.addEventListener('change', () => { page = 0; render(); });
  resolutionSelect.addEventListener('change', render);
  previousPage.addEventListener('click', () => { if (page > 0) { page -= 1; render(); grid.scrollIntoView({ block: 'start', behavior: 'smooth' }); } });
  nextPage.addEventListener('click', () => { page += 1; render(); grid.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  downloadButton.addEventListener('click', downloadAll);
  render();
})();
