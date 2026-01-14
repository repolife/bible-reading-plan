import * as MaterialTailwind from '@material-tailwind/react';
import { Popover } from '@material-tailwind/react';

console.log('Keys of MaterialTailwind:', Object.keys(MaterialTailwind));
console.log('Keys of Popover:', Object.keys(Popover));
if (Popover.Handler) console.log('Popover.Handler exists');
if (Popover.Content) console.log('Popover.Content exists');
