import {Component, EventEmitter, forwardRef, Inject, Input, OnDestroy, OnInit, Output, PLATFORM_ID, ViewEncapsulation} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {Subject, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {NgxAuthFirebaseuiAnimations} from '../../animations';
import {AuthProcessService} from '../../services/auth-process.service';
import {isPlatformBrowser} from '@angular/common';
import {MatFormFieldAppearance} from '@angular/material/form-field';
import {ThemePalette} from '@angular/material/core';
import { NgxAuthFirebaseUIConfigToken } from '../../tokens';
import { NgxAuthFirebaseUIConfig } from '../../interfaces';
import {I18nMessagesService} from '../../services/i18n-messages.service';

export const confirmPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.parent || !control) {
    return null;
  }

  const password = control.parent.get('password');
  const passwordConfirm = control.parent.get('passwordConfirm');

  if (!password || !passwordConfirm) {
    return null;
  }

  if (passwordConfirm.value === '') {
    return null;
  }

  if (password.value === passwordConfirm.value) {
    return null;
  }

  return {passwordsNotMatching: true};
};

@Component({
  selector: 'ngx-auth-firebaseui-register',
  templateUrl: './ngx-auth-firebaseui-register.component.html',
  styleUrls: ['./ngx-auth-firebaseui-register.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: NgxAuthFirebaseuiAnimations
})
export class NgxAuthFirebaseuiRegisterComponent implements OnInit, OnDestroy {

  @Input() logoUrl: string;
  @Input() appearance: MatFormFieldAppearance;
  @Input() tosUrl: string;
  @Input() privacyPolicyUrl: string;

  i18nMessageService = I18nMessagesService;
  // Events
  // tslint:disable-next-line:no-output-on-prefix
  @Output() onSuccess: any;
  // tslint:disable-next-line:no-output-on-prefix
  @Output() onError: any;
  // tslint:disable-next-line:no-output-on-prefix
  @Output() onLoginRequested: EventEmitter<void> = new EventEmitter<void>();
  // tslint:disable-next-line:no-output-on-prefix
  @Output() onCreateAccountButtonClicked: EventEmitter<void> = new EventEmitter();

  registerForm: FormGroup;
  onErrorSubscription: Subscription;
  authenticationError = false;

  // Private
  private unsubscribeAll: Subject<any>;

  // tslint:disable-next-line:ban-types
  constructor(
    // tslint:disable-next-line:ban-types
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(forwardRef(() => NgxAuthFirebaseUIConfigToken))
    public config: NgxAuthFirebaseUIConfig,
    private formBuilder: FormBuilder,
    public authProcess: AuthProcessService
  ) {
    // Configure the layout

    // Set the private defaults
    this.unsubscribeAll = new Subject();
    this.onSuccess = authProcess.onSuccessEmitter;
    this.onError = authProcess.onErrorEmitter;
  }

  get color(): string | ThemePalette {
    return this.authenticationError ? 'warn' : 'primary';
  }

  get colorAccent(): string | ThemePalette {
    return this.authenticationError ? 'warn' : 'accent';
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.onErrorSubscription = this.onError.subscribe(() => this.authenticationError = true);
    }
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required,
                     Validators.minLength(this.config.passwordMinLength),
                     Validators.maxLength(this.config.passwordMaxLength)]],
      passwordConfirm: ['', [Validators.required, confirmPasswordValidator]],
      tos: [''],
      privacyPolicy: ['']
    });

    // If tos or privacy policy url set, ensure that the two form items are required
    if (this.tosUrl) {
      this.registerForm.controls.tos.setValidators(Validators.requiredTrue);
    }

    if (this.privacyPolicyUrl) {
      this.registerForm.controls.privacyPolicy.setValidators(Validators.requiredTrue);
    }

    // Update the validity of the 'passwordConfirm' field
    // when the 'password' field changes
    this.registerForm
      .controls
      .password
      .valueChanges.pipe(takeUntil(this.unsubscribeAll))
      .subscribe(() => {
        this.registerForm.controls.passwordConfirm.updateValueAndValidity();
      });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.unsubscribeAll.next();
    this.unsubscribeAll.complete();
  }

  async createAccount() {
    // Emit the create account clicked event.
    this.onCreateAccountButtonClicked.emit();


    return await this.authProcess.signUp(
      this.registerForm.controls.name.value,
      {
        email: this.registerForm.controls.email.value,
        password: this.registerForm.controls.password.value
      }
    );
  }
}
