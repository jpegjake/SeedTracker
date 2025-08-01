export class SeedTracked {
  public idseeds: number = 0;
  public type: string = '';
  public subtype: string = '';
  public qty: number = 0;
  public datePlanted: Date | null = new Date();
  public dateTransPlanted: Date | null = new Date();
  public notes: string = '';
}
