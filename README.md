# AprilTag Studio

Gerador gratuito de marcadores AprilTag direto no navegador. Escolha uma família, defina a faixa de IDs, visualize os marcadores e baixe PNGs individuais ou um ZIP — sem enviar os arquivos para um servidor.

**Aplicação:** [apriltaggenerator.vercel.app](https://apriltaggenerator.vercel.app)

## Recursos

- Famílias `tag36h11`, `tag25h9` e `tag16h5`.
- Definição de qualquer intervalo por ID inicial e final, respeitando o limite da família selecionada.
- Pré-visualização em cartões quadrados, paginada para manter a interface ágil.
- Exportação de PNG individual ou de todos os IDs selecionados em um arquivo ZIP.
- Resolução de imagem configurável: 480, 800, 1200 ou 1600 px.
- Processamento local no navegador: os marcadores não são enviados para a aplicação.
- Interface responsiva e controles utilizáveis por teclado.

## Como usar

1. Abra [AprilTag Studio](https://apriltaggenerator.vercel.app).
2. Escolha a família AprilTag.
3. Informe o primeiro e o último ID desejados. Por exemplo, `0` e `258` selecionam os IDs de 0 a 258, inclusive.
4. Escolha a resolução e confira os marcadores na pré-visualização. Use os controles de paginação para navegar por intervalos maiores.
5. Clique em **Baixar todas as imagens** para salvar um PNG ou um ZIP, conforme a quantidade selecionada. Também é possível baixar um marcador pelo botão na respectiva miniatura.

Cada família possui seu próprio conjunto de IDs válidos. Caso a faixa ultrapasse o limite da família selecionada, a aplicação informa o ID inválido.

## Executar localmente

O projeto é estático e não requer instalação de dependências nem etapa de build. Sirva a pasta raiz com qualquer servidor HTTP local. Por exemplo, com Python instalado:

```bash
python -m http.server 8000
```

Depois, acesse <http://localhost:8000>. A geração dos marcadores depende de acesso à internet para carregar as bibliotecas e os dados das famílias via CDN.

## Tecnologias

- HTML, CSS e JavaScript — aplicação estática, sem framework JavaScript.
- [Tailwind CSS](https://tailwindcss.com/) — utilitários visuais carregados via CDN.
- [apriltag](https://www.npmjs.com/package/apriltag) — dados das famílias e renderização dos marcadores.
- [JSZip](https://stuk.github.io/jszip/) — compactação dos PNGs para download em lote.
- Ícones SVG inline inspirados no conjunto [Lucide](https://lucide.dev/).

## Estrutura

```text
├── index.html   # Página e estrutura da interface
├── styles.css   # Estilos responsivos e componentes
├── app.js       # Geração, pré-visualização, paginação e downloads
├── LICENSE      # Licença MIT
└── README.md    # Documentação
```

## Licença

Este projeto está disponível sob a licença [MIT](LICENSE).
