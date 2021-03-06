import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  ElementRef
} from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormArray,
  Validators,
  FormControlName
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import "rxjs/add/operator/debounceTime";
import "rxjs/add/observable/fromEvent";
import "rxjs/add/observable/merge";
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

import { IProduct } from "./product";
import { ProductService } from "./product.service";

import { NumberValidators } from "../shared/number.validator";
import { GenericValidator } from "../shared/generic-validator";
import { ICategory } from "./index";

@Component({
  templateUrl: "./product-edit.component.html",
  styles: [
    `
    .example-section {
        display: flex;
        align-content: center;
        align-items: center;
        height: 60px;
        }

        .example-margin {
        margin: 0 10px;
        }
    `
  ]
})
export class ProductEditComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren(FormControlName, { read: ElementRef })
  formInputElements: ElementRef[];

  pageTitle: string = "Update Product";
  errorMessage: string;
  productForm: FormGroup;

  product: IProduct = <IProduct>{};
  private sub: Subscription;
  showImage: boolean;
  categories: ICategory[];

  // Use with the generic validation messageId class
  displayMessage: { [key: string]: string } = {};
  private validationMessages: { [key: string]: { [key: string]: string } };
  private genericValidator: GenericValidator;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) {
    // Defines all of the validation messageIds for the form.
    // These could instead be retrieved from a file or database.
    this.validationMessages = {
      product: {
        required: "Product name is required.",
        minlength: "Product name must be at least one characters.",
        maxlength: "Product name cannot exceed 200 characters."
      },
      unitPrice: {
        range:
          "Price of the product must be between 1 (lowest) and 9999 (highest)."
      },
      unitInStock: {
        range:
          "Quantity of the product must be between 1 (lowest) and 2000 (highest)."
      }
    };

    this.genericValidator = new GenericValidator(this.validationMessages);
  }

  ngOnInit(): void {
    this.productForm = this.fb.group({
      productName: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100)
        ]
      ],
      unitPrice: ["", NumberValidators.range(1, 99999)],
      unitInStock: ["", NumberValidators.range(1, 2000)],
      categoryId: ["", NumberValidators.range(1, 9999999)],
    });

    // Read the product Id from the route parameter
    this.sub = this.route.params.subscribe(params => {
      let id = +params["id"];
      this.getProduct(id);
    });

    this.getCategories();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  ngAfterViewInit(): void {
    // Watch for the blur event from any input element on the form.
    let controlBlurs: Observable<any>[] = this.formInputElements.map(
      (formControl: ElementRef) =>
        Observable.fromEvent(formControl.nativeElement, "blur")
    );

    // Merge the blur event observable with the valueChanges observable
    Observable.merge(this.productForm.valueChanges, ...controlBlurs)
      .debounceTime(800)
      .subscribe(value => {
        this.displayMessage = this.genericValidator.processMessages(
          this.productForm
        );
      });
  }

  getProduct(id: number): void {
    this.productService
      .getProduct(id)
      .subscribe(
      (product: IProduct) => this.onProductRetrieved(product),
      (error: any) => (this.errorMessage = <any>error)
      );
  }

  getCategories(): void {
    this.productService
      .getCategories()
      .subscribe(
      categories => (this.categories = categories),
      error => (this.errorMessage = <any>error)
      );
  }

  onProductRetrieved(product: IProduct): void {
    if (this.productForm) {
      this.productForm.reset();
    }
    this.product = product;

    if (this.product.id === 0) {
      this.pageTitle = "Add Product";
    } else {
      this.pageTitle = `Update Product: ${this.product.productName} `;
    }

    // Update the data on the form
    this.productForm.patchValue({
      productName: this.product.productName,
      unitPrice: this.product.unitPrice,
      unitInStock: this.product.unitInStock,
      categoryId: this.product.categoryId
    });
  }

  deleteProduct(): void {
    if (this.product.id === 0) {
      // Don't delete, it was never saved.
      this.onSaveComplete();
    } else {
      if (confirm(`Really delete the product: ${this.product.productName}?`)) {
        this.productService
          .deleteProduct(this.product.id)
          .subscribe(
          () => this.onSaveComplete(),
          (error: any) => (this.errorMessage = <any>error)
          );
      }
    }
  }

  saveProduct(): void {
    if (this.productForm.dirty && this.productForm.valid) {
      // Copy the form values over the product object values
      let p = Object.assign({}, this.product, this.productForm.value);

      this.productService
        .saveProduct(p)
        .subscribe(
        () => this.onSaveComplete(),
        (error: any) => (this.errorMessage = <any>error)
        );
    } else if (!this.productForm.dirty) {
      this.onSaveComplete();
    }
  }

  onSaveComplete(): void {
    // Reset the form to clear the flags
    this.productForm.reset();
    this.router.navigate(["/products"]);
  }
}
