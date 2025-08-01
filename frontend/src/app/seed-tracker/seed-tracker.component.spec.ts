import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeedTrackerComponent } from './seed-tracker.component';

describe('SeedTrackerComponent', () => {
  let component: SeedTrackerComponent;
  let fixture: ComponentFixture<SeedTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SeedTrackerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SeedTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
