(() => {
  const familySelect = document.querySelector('#family');
  const countInput = document.querySelector('#count');
  const countOutput = document.querySelector('#count-output');
  const chips = document.querySelector('#id-chips');
  const grid = document.querySelector('#tag-grid');
  const downloadButton = document.querySelector('#download-all');
  const buttonCount = document.querySelector('#button-count');
  const resolutionSelect = document.querySelector('#resolution');
  const resolutionLabel = document.querySelector('#resolution-label');
  const subtitle = document.querySelector('#preview-subtitle');
  const error = document.querySelector('#error');
  const cache = new Map();

  const configNames = {
    '36h11': '36h11',
    'tag25h9': '25h9',
    'tag16h5': '16h5'
  };

  function currentIds() {
    return Array.from({ length: Number(countInput.value) }, (_, index) => index);
  }

  async function loadFamily(family) {
    if (!window.AprilTagFamily) throw new Error('A biblioteca de geração não carregou. Confira sua conexão e recarregue a página.');
    if (!cache.has(family)) {
      const name = configNames[family];
      const response = await fetch(`https://cdn.jsdelivr.net/npm/apriltag@2.0.3/families/${name}.json`);
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

  function updateLabels() {
    const count = currentIds().length;
    countOutput.textContent = `${count} ${count === 1 ? 'tag' : 'tags'}`;
    buttonCount.textContent = `${count} PNG${count === 1 ? '' : 's'}`;
    subtitle.textContent = `${count} ${count === 1 ? 'marcador selecionado' : 'marcadores selecionados'}`;
    const fragment = document.createDocumentFragment();
    currentIds().forEach(id => {
      const chip = document.createElement('span');
      chip.className = 'id-chip';
      chip.textContent = `ID ${id}`;
      fragment.append(chip);
    });
    chips.replaceChildren(fragment);
  }

  async function render() {
    const ids = currentIds();
    const resolution = Number(resolutionSelect.value);
    updateLabels();
    resolutionLabel.textContent = `${resolution} × ${resolution} px`;
    error.hidden = true;
    grid.setAttribute('aria-busy', 'true');
    const cards = ids.map(id => {
      const card = document.createElement('article');
      card.className = 'tag-card';
      card.innerHTML = `<div class="tag-meta"><span class="tag-id">ID ${id}</span><button class="tag-download" type="button" aria-label="Baixar imagem do ID ${id}" title="Baixar PNG">↓</button></div>`;
      return { id, card };
    });
    grid.replaceChildren(...cards.map(item => item.card));
    try {
      const family = await loadFamily(familySelect.value);
      await Promise.all(cards.map(async ({ id, card }) => {
        if (id >= family.codes.length) throw new Error(`ID ${id} não existe na família selecionada.`);
        const blob = await makePng(family, id, resolution);
        const url = URL.createObjectURL(blob);
        const image = document.createElement('img');
        image.className = 'tag-image';
        image.width = resolution;
        image.height = resolution;
        image.alt = `Marcador AprilTag ${familySelect.value}, ID ${id}`;
        image.src = url;
        card.prepend(image);
        card.querySelector('.tag-download').addEventListener('click', () => saveBlob(blob, `apriltag-${familySelect.value}-id-${id}.png`));
      }));
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : 'Ocorreu um erro ao gerar os marcadores.';
      error.hidden = false;
    } finally {
      grid.setAttribute('aria-busy', 'false');
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
      if (!window.JSZip && ids.length > 1) throw new Error('A biblioteca ZIP não carregou. Confira sua conexão e tente novamente.');
      if (ids.length === 1) {
        saveBlob(await makePng(family, ids[0], resolution), `apriltag-${familySelect.value}-id-${ids[0]}.png`);
      } else {
        const zip = new window.JSZip();
        for (const id of ids) {
          if (id >= family.codes.length) throw new Error(`ID ${id} não existe na família selecionada.`);
          const blob = await makePng(family, id, resolution);
          zip.file(`apriltag-${familySelect.value}-id-${id}.png`, blob);
        }
        saveBlob(await zip.generateAsync({ type: 'blob' }), `apriltags-${familySelect.value}-ids-${ids[0]}-${ids[ids.length - 1]}.zip`);
      }
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : 'Ocorreu um erro ao exportar as imagens.';
      error.hidden = false;
    } finally {
      downloadButton.disabled = false;
      downloadButton.removeAttribute('aria-busy');
    }
  }

  countInput.addEventListener('input', render);
  familySelect.addEventListener('change', render);
  resolutionSelect.addEventListener('change', render);
  downloadButton.addEventListener('click', downloadAll);
  render();
})();
