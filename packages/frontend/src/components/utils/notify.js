// utils/notify.ts
import { toast } from 'react-toastify';

export const notify = (message, type) => {

  type === 'error'
    ? toast.error(message)
    : toast.success(message);
};