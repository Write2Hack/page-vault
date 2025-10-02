import { supabase } from '../../lib/supabase.js';

const template = document.createElement('template');
let templateLoaded = false;
let pendingComponents = [];

// Debug the template loading path
const templatePath = new URL('src/components/Auth/Auth.html', window.location.href).href;
console.log('Loading template from:', templatePath);

// Fetch and set the HTML content for the template
fetch(templatePath)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then(html => {
        console.log('Raw template HTML:', html); // Debug the actual HTML content
        if (!html.trim()) {
            throw new Error('Template HTML is empty');
        }
        template.innerHTML = html;
        templateLoaded = true;

        // Verify template content
        console.log('Template elements:', {
            hasSignInBtn: template.content.querySelector('#signInBtn') !== null,
            hasEmail: template.content.querySelector('#email') !== null,
            hasPassword: template.content.querySelector('#password') !== null
        });

        pendingComponents.forEach(component => {
            component.attachTemplate();
            component.initializeComponent();
        });
        pendingComponents = [];
    })
    .catch(error => {
        console.error('Template loading error:', error);
        console.error('Current location:', window.location.href);
    });

class AuthComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        if (templateLoaded) {
            this.attachTemplate();
            this.initializeComponent();
        } else {
            pendingComponents.push(this);
        }
    }

    attachTemplate() {
        this.shadowRoot.innerHTML = ''; // Simpler way to clear
        const clone = template.content.cloneNode(true);
        console.log('Cloned template elements:', {
            hasSignInBtn: clone.querySelector('#signInBtn') !== null,
            hasEmail: clone.querySelector('#email') !== null,
            hasPassword: clone.querySelector('#password') !== null
        });
        this.shadowRoot.appendChild(clone);
    }

    initializeComponent() {
        this.signInBtn = this.shadowRoot.querySelector('#signInBtn');
        this.emailInput = this.shadowRoot.querySelector('#email');
        this.passwordInput = this.shadowRoot.querySelector('#password');

        console.log('Elements found:', {
            signInBtn: !!this.signInBtn,
            emailInput: !!this.emailInput,
            passwordInput: !!this.passwordInput
        });

        if (!this.signInBtn) {
            console.error('Sign in button not found. Expected element with id "signInBtn"');
        }
        if (!this.emailInput) {
            console.error('Email input not found. Expected element with id "email"');
        }
        if (!this.passwordInput) {
            console.error('Password input not found. Expected element with id "password"');
        }

        if (!this.signInBtn || !this.emailInput || !this.passwordInput) {
            return;
        }

        this.signInBtn.addEventListener('click', () => this.signIn());
    }

    async signIn() {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: this.emailInput.value,
            password: this.passwordInput.value,
        });

        if (error) {
            alert('Error signing in: ' + error.message);
        } else {
            // Successful sign-in, dispatch an event
            this.dispatchEvent(new CustomEvent('signin-success', { bubbles: true, composed: true }));
        }
    }
}

customElements.define('auth-component', AuthComponent);
