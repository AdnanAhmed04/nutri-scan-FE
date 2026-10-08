import { create } from 'twrnc';
import tailwindConfig from '../../tailwind.config';

// Create pre-configured tw instance with custom theme extensions
const tw = create(tailwindConfig);

export default tw;
