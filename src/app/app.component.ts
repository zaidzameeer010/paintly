import { Component } from '@angular/core';
import { CanvasComponent } from './components/canvas/canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CanvasComponent],
  template: `
    <main class="relative w-screen h-screen overflow-hidden">
      <app-canvas></app-canvas>
    </main>
  `
})
export class AppComponent {}
