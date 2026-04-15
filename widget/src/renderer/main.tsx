import React from 'react';
import { createRoot } from 'react-dom/client';
import { Widget } from './Widget';
import './styles.css';

const root = document.getElementById('root')!;
createRoot(root).render(<Widget />);
