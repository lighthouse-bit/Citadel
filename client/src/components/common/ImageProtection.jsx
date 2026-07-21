import { useEffect } from 'react';

const ImageProtection = () => {
  useEffect(() => {
    const protectImages = root => {
      if (root instanceof HTMLImageElement) root.draggable = false;
      root.querySelectorAll?.('img').forEach(image => { image.draggable = false; });
    };
    const isProtectedImage = target => target instanceof Element && Boolean(target.closest('img'));
    const preventImageAction = event => {
      if (isProtectedImage(event.target)) event.preventDefault();
    };

    document.body.classList.add('image-protected-site');
    protectImages(document);
    document.addEventListener('contextmenu', preventImageAction, true);
    document.addEventListener('dragstart', preventImageAction, true);
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) protectImages(node);
    })));
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.body.classList.remove('image-protected-site');
      document.removeEventListener('contextmenu', preventImageAction, true);
      document.removeEventListener('dragstart', preventImageAction, true);
      observer.disconnect();
    };
  }, []);

  return null;
};

export default ImageProtection;
