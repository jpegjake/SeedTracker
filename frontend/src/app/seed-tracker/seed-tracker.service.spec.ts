import { TestBed } from '@angular/core/testing';

import { SeedTrackerService } from './seed-tracker.service';

describe('SeedTrackerService', () => {
  let service: SeedTrackerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeedTrackerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
