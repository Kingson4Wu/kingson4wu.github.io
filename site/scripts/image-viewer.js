document.querySelectorAll('.prose img').forEach((image) => {
  image.addEventListener('click', () => {
    const overlay = document.createElement('div');
    const enlarged = document.createElement('img');

    overlay.className = 'image-viewer';
    enlarged.src = image.currentSrc || image.src;
    enlarged.alt = image.alt || '';
    overlay.append(enlarged);
    overlay.addEventListener('click', () => overlay.remove());
    document.body.append(overlay);
  });
});
