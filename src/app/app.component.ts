import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CanvasComponent } from './components/canvas/canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, CanvasComponent],
  template: `
    <main class="relative w-screen h-screen overflow-hidden">
      <app-canvas></app-canvas>
    </main>
  `,
  styles: []
})
export class AppComponent {
  title = 'Paintly - Modern Web Canvas';
}
