import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../core/reveal';
import { Icon } from '../core/icon';
import { SeoService } from '../core/seo';

@Component({
  selector: 'app-about',
  imports: [RouterLink, RevealDirective, Icon],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About implements OnInit {
  private seo = inject(SeoService);

  ngOnInit() {
    this.seo.update({
      title: "About GT Garage — Mabalacat's Trusted Auto Shop",
      description: 'Owner Glen Tuazon has run GT Garage in Mabalacat, Pampanga since 2021 on one rule: do the job right and tell the truth about it. Find us at 183 Orange Street, San Francisco.',
      path: '/about',
    });
  }
}
