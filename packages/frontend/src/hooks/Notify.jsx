import { useCallback } from 'react';
import { Bounce, toast, ToastContainer } from 'react-toastify';

export const useNotify = ({ message, type }) => {
  const notify = useCallback(() => {
    if (type === 'error') {
      toast.error(message, { theme: 'dark' });
    } else {
      toast.success(message, { theme: 'dark' });
    }
  }, [message, type]);

  const Notify = () => (
    <ToastContainer
      position="bottom-center"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="dark"
      transition={Bounce}
    />
  );

  return { notify, Notify };
};