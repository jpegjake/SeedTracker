import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, AfterViewChecked, AfterContentChecked, AfterContentInit, OnDestroy } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  FormArray,
  FormControl,
  Validators,
} from '@angular/forms';
import { SeedTrackerService } from './seed-tracker.service';
import { SeedTracked } from './seedtracked';
import {
  BehaviorSubject,
  Observable,
  Subject,
  merge,
  tap,
  combineLatest,
  filter,
  switchMap,
  of,
  firstValueFrom
} from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatDialogComponent } from '../mat-dialog/mat-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-seed-tracker',
  templateUrl: './seed-tracker.component.html',
  styleUrls: ['./seed-tracker.component.css'],
  standalone: false,
})
export class SeedTrackerComponent implements OnInit, OnDestroy {
  myForm!: FormGroup;
  _formBuilder: FormBuilder = new FormBuilder();
  plantTypes: string[] = [];
  filteredPlantTypes: Observable<string[]> = new Observable<string[]>();
  plantSubTypes: string[] = [];
  filteredPlantSubTypes: Observable<string[]> = new Observable<string[]>();
  crops: SeedTracked[] = [];
  errorMessage: string = '';
  editRowMode: boolean = false;
  printMode: boolean = true;
  editRowID: string = '';
  isLoading: boolean = false;

  private refreshData: BehaviorSubject<void> = new BehaviorSubject<void>(
    undefined
  );

  constructor(
    private seedTrackerService: SeedTrackerService,
    private dialogService: MatDialog
  ) {}

  ngOnInit() {
    this.myForm = this._formBuilder.group({
      type: [null, [Validators.required]],
      subtype: [null],
      qty: [null, [Validators.required]],
      datePlanted: [null],
      dateTransPlanted: [null],
      notes: [null],
    });

    //observer to plant types
    const observerPlantTypeOptions = this.seedTrackerService
      .createPollingObservableShared(
        this.seedTrackerService.getPlantTypeData,
        this.refreshData,
        60 * 1000
      )
      .pipe(
        tap((options) => {
          this.plantTypes = options;
        })
      );

    this.filteredPlantTypes = combineLatest([
      observerPlantTypeOptions, // First emission will be the database data
      this.myForm.controls['type'].valueChanges.pipe(startWith('')), // Start with an empty string for the filter
    ]).pipe(
      map(([allOptions, filterValue]) => {
        // If the filterValue is null or an empty string, return all options,
        // otherwise apply the filter
        const currentFilter = filterValue || ''; // Ensure filterValue is a string
        return currentFilter
          ? allOptions.filter((option) =>
              option.toLowerCase().includes(currentFilter.toLowerCase())
            )
          : allOptions.slice(); // Return a copy of all options
      })
    );

    this.filteredPlantSubTypes = this.myForm.controls['type'].valueChanges.pipe(
      tap(() => {
        this.myForm.controls['subtype'].setValue(null); // Clear subcategory on category change
        this.plantSubTypes = []; // Clear previous subcategories
      }),
      switchMap((selectedCategory) => {
        return this.seedTrackerService
          .getPlantSubTypeData(selectedCategory ?? '')
          .pipe(
            tap((subCats) => {
              this.plantSubTypes = subCats;
            })
          );
      })
    );

    //subscribe to seeds list
    this.seedTrackerService
      .createPollingObservableShared(
        this.seedTrackerService.getSeeds,
        this.refreshData,
        30 * 1000
      )
      .subscribe({
        next: (data: SeedTracked[]) => {
          if (data && data.length > 0) {
            this.crops = this.sort(data);
          } else {
            this.crops = data;
            this.printMode = false; // Disable print mode if no crops are available
          }
          this.isLoading = false; // Set loading state to false
        },
        error: (error) => {
          this.errorMessage = error;
        },
      });

    this.isLoading = true; // Set loading state to true
  }

  onPlantTypeChange(): void {
    this.seedTrackerService
      .getPlantSubTypeData(this.myForm.controls['type'].value)
      .subscribe({
        next: (data) => {
          this.plantSubTypes = data;
          this.myForm.controls['subtype'].setValue(null);
        },
        error: (error) => {
          this.plantSubTypes = [];
        },
      });
  }

  ngOnDestroy(): void {
    this.refreshData.complete(); // Clean up the BehaviorSubject to prevent memory leaks
    this.seedTrackerService.stopAllPolling();
  }

  resetForm(): void {
    this.myForm.controls['type'].setValue('');
    this.myForm.controls['subtype'].setValue('');
    this.myForm.controls['qty'].setValue('');
    this.myForm.controls['datePlanted'].setValue('');
    this.myForm.controls['dateTransPlanted'].setValue('');
    this.myForm.controls['notes'].setValue('');
  }

  setForm(crop: SeedTracked): void {
    this.myForm.controls['type'].setValue(crop.type);
    this.myForm.controls['subtype'].setValue(crop.subtype);
    this.myForm.controls['qty'].setValue(crop.qty);
    this.myForm.controls['datePlanted'].setValue(
      crop.datePlanted == null
        ? null
        : new Date(crop.datePlanted).toISOString().substring(0, 10)
    );
    this.myForm.controls['dateTransPlanted'].setValue(
      crop.dateTransPlanted == null
        ? null
        : new Date(crop.dateTransPlanted).toISOString().substring(0, 10)
    );
    this.myForm.controls['notes'].setValue(crop.notes);
  }

  addNewCrop(): void {
    let new_plant = new SeedTracked();
    new_plant.type = this.myForm.controls['type'].value;
    new_plant.subtype = this.myForm.controls['subtype'].value;
    new_plant.qty = this.myForm.controls['qty'].value;
    new_plant.datePlanted = this.myForm.controls['datePlanted'].value;
    new_plant.dateTransPlanted = this.myForm.controls['dateTransPlanted'].value;
    new_plant.notes = this.myForm.controls['notes'].value;

    this.seedTrackerService.addSeed(new_plant).subscribe(
      (response) => {
        this.resetForm();
        this.refreshData.next();
      },
      (error) => {
        this.errorMessage = 'Error inserting the data.';
      }
    );
  }

  editCrop(crop: SeedTracked): void {
    this.editRowMode = !this.editRowMode;
    this.editRowID = crop.created;

    if (!this.editRowMode) this.resetForm();
    else this.setForm(crop);
  }

  submitEdit(): void {
    let revised_plant = new SeedTracked();
    revised_plant.created = this.editRowID;
    revised_plant.type = this.myForm.controls['type'].value;
    revised_plant.subtype = this.myForm.controls['subtype'].value;
    revised_plant.qty = this.myForm.controls['qty'].value;

    revised_plant.datePlanted =
      this.myForm.controls['datePlanted'].value == ''
        ? null
        : this.myForm.controls['datePlanted'].value;

    revised_plant.dateTransPlanted =
      this.myForm.controls['dateTransPlanted'].value == ''
        ? null
        : this.myForm.controls['dateTransPlanted'].value;

    revised_plant.notes = this.myForm.controls['notes'].value;
    //do edit
    this.seedTrackerService.editSeed(revised_plant).subscribe(
      (response) => {
        //undo edit mode
        this.editCrop(revised_plant);
        this.refreshData.next();
      },
      (error) => {
        this.editCrop(revised_plant);
        this.errorMessage = 'Error updating the data.';
      }
    );
  }

  async deleteCrop(crop: SeedTracked) {
    const dialogResult = await MatDialogComponent.openDialog(
      this.dialogService,
      'Delete ' +
        (crop.subtype ? `${crop.type} / ${crop.subtype}` : crop.type) +
        ' ?',
      'Are you sure you are ready to delete "' +
        (crop.subtype ? `${crop.type} / ${crop.subtype}` : crop.type) +
        '"?'
    );
    if (dialogResult)
      this.seedTrackerService.deleteSeed(crop.created).subscribe(
        (response) => {
          this.refreshData.next();
        },
        (error) => {
          this.errorMessage = 'Error deleting the data.';
        }
      );
  }

  printPage() {
    // const printContents = document.getElementById('print-area')?.innerHTML;
    // const originalContents = document.body.innerHTML;

    // if (printContents) {
    //   document.body.innerHTML = printContents;
         window.print();
    //   document.body.innerHTML = originalContents;
    //   location.reload(); // optional: reload to restore bindings
    // }
  }

  private _filterTypes(value: string): string[] {
    if (value == null || value == '') return this.plantTypes;
    const filterValue = value.toLowerCase();

    return this.plantTypes.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }
  private _filterSubTypes(value: string): string[] {
    if (value == null || value == '') return this.plantSubTypes;
    const filterValue = value.toLowerCase();

    return this.plantSubTypes.filter((option) =>
      option.toLowerCase().includes(filterValue)
    );
  }

  currentSort = {
    column: 'created',
    direction: 'asc',
  };

  sortBy(column: string) {
    if (this.editRowMode) return;

    const dir =
      this.currentSort.column === column && this.currentSort.direction === 'asc'
        ? 'desc'
        : 'asc';
    this.currentSort = { column, direction: dir };

    this.crops = this.sort(this.crops);
  }

  sort(data: SeedTracked[]): SeedTracked[] {
    if (this.currentSort.column === '') return data;
    return data.sort((a, b) => {
      const valA = a[this.currentSort.column as keyof SeedTracked];
      const valB = b[this.currentSort.column as keyof SeedTracked];

      // Treat null or undefined values as less than any real value (can be reversed)
      if (valA == null && valB == null) return 0;
      if (valA == null) return this.currentSort.direction === 'asc' ? 1 : -1;
      if (valB == null) return this.currentSort.direction === 'asc' ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.currentSort.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return this.currentSort.direction === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });
  }
}
