export function showToast(message: string, durationMs: number = 1500) {
  const container = document.createElement('div');
  container.className = 'fixed inset-0 pointer-events-none z-[1000]';

  const toast = document.createElement('div');
  toast.className = [
    'absolute left-1/2 -translate-x-1/2 bottom-10',
    'px-4 py-2 rounded-md shadow-lg',
    'bg-black/80 text-white text-sm',
    'opacity-0 transition-opacity duration-200',
  ].join(' ');
  toast.textContent = message;

  container.appendChild(toast);
  document.body.appendChild(container);

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
  });

  const cleanup = () => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0');
    setTimeout(() => {
      container.remove();
    }, 200);
  };

  setTimeout(cleanup, durationMs);
}
