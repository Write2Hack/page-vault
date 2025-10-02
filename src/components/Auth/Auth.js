import { supabase } from '../../lib/supabase.js';

const template = document.createElement('template');
template.innerHTML = `
<div class="row justify-content-center align-items-center vh-100">
        <form class="form-signin col-md-3">
            <img class="mb-4" src="image.png" alt="" width="72" height="57">
            <h1 class="h3 mb-3 fw-normal">Page Vault</h1>
            <div class="form-floating">
                <input type="email" class="form-control" id="email" placeholder="name@example.com">
                <label for="email">Email address</label>
            </div>
            <div class="form-floating">
                <input type="password" class="form-control" id="password" placeholder="Password">
                <label for="password">Password</label>
            </div>
            <div class="form-check text-start my-3">
                <input class="form-check-input" type="checkbox" id="rememberMe">
                <label class="form-check-label" for="rememberMe">
                Remember me
                </label>
            </div>
            <button type="button" class="btn btn-primary w-100 py-2" id="signInBtn">Sign In</button>
        </form>
</div>
`;

class AuthComponent extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.attachTemplate();
        this.initializeComponent();
    }
    
    attachTemplate() {
        this.innerHTML = ''; // Clear existing content
        const clone = template.content.cloneNode(true);
        this.appendChild(clone);
    }
    
    initializeComponent() {
        this.signInBtn = this.querySelector('#signInBtn');
        this.emailInput = this.querySelector('#email');
        this.passwordInput = this.querySelector('#password');
        this.rememberMe = this.querySelector('#rememberMe');
        
        if (!this.signInBtn || !this.emailInput || !this.passwordInput) {
            return;
        }
        
        this.signInBtn.addEventListener('click', () => this.signIn());
        
        // Check if there's a remembered email
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            this.emailInput.value = rememberedEmail;
            this.rememberMe.checked = true;
        }
    }
    
    async signIn() {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: this.emailInput.value,
            password: this.passwordInput.value,
        });
        
        if (error) {
            alert('Error signing in: ' + error.message);
        } else {
            // Handle remember me
            if (this.rememberMe.checked) {
                localStorage.setItem('rememberedEmail', this.emailInput.value);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            
            // Successful sign-in, dispatch an event
            this.dispatchEvent(new CustomEvent('signin-success', { bubbles: true, composed: true }));
        }
    }
}

customElements.define('auth-component', AuthComponent);
