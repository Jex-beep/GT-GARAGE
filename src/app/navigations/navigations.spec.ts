import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Navigations } from './navigations';

describe('Navigations', () => {
  let component: Navigations;
  let fixture: ComponentFixture<Navigations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navigations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navigations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
