import { Component, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef , MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-mat-dialog',
  templateUrl: './mat-dialog.component.html',
  styleUrl: './mat-dialog.component.css',
  standalone: false
})
export class MatDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MatDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string, message: string }
  ) {}

  static async openDialog(dialog: MatDialog, title: string, message: string): Promise<boolean> {
    const dialogRef = dialog.open(MatDialogComponent, {
      data: {
        title: title,
        message: message
      },
    });

    return await firstValueFrom(dialogRef.afterClosed());
  }

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
