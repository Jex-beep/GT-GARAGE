import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navigations } from './navigations/navigations';
import { Footer } from './footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navigations, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('GTGARAGE');
}
