<script setup>
import { ref } from 'vue';

const isLogin = ref(true);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const loginForm = ref({
    email: '',
    password: '',
    rememberMe: false
});

const signupForm = ref({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    taxId: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
});

const toggleAuthMode = () => {
    isLogin.value = !isLogin.value;
    // Reset forms
    loginForm.value = { email: '', password: '', rememberMe: false };
    signupForm.value = {
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        taxId: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
    };
};

const handleLogin = () => {
    console.log('Login:', loginForm.value);
    alert('Login functionality would be implemented here');
};

const handleSignup = () => {
    if (signupForm.value.password !== signupForm.value.confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    if (!signupForm.value.agreeToTerms) {
        alert('Please agree to the terms and conditions');
        return;
    }
    console.log('Signup:', signupForm.value);
    alert('Signup functionality would be implemented here');
};
</script>

<template>
    <div class="auth-page">
        <!-- Left Side - Branding -->
        <div class="branding-section">
            <div class="branding-content">
                <div class="logo">
                    <span class="logo-icon">🧶</span>
                    <h1>Kitcharoen</h1>
                </div>
                <h2 class="tagline">Wholesale Handicraft Materials</h2>
                <p class="description">
                    Premium yarns, beads, and craft supplies for businesses.
                    Join thousands of retailers and artisans who trust us for quality materials at wholesale prices.
                </p>

                <div class="benefits">
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span>Bulk pricing discounts</span>
                    </div>
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span>Fast shipping nationwide</span>
                    </div>
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span>Dedicated account manager</span>
                    </div>
                    <div class="benefit-item">
                        <span class="benefit-icon">✓</span>
                        <span>Priority customer support</span>
                    </div>
                </div>
            </div>

            <div class="decorative-pattern"></div>
        </div>

        <!-- Right Side - Auth Forms -->
        <div class="form-section">
            <div class="form-container">
                <!-- Login Form -->
                <div v-show="isLogin" class="auth-form">
                    <h2 class="form-title">Welcome Back</h2>
                    <p class="form-subtitle">Sign in to your wholesale account</p>

                    <form @submit.prevent="handleLogin">
                        <div class="form-group">
                            <label for="login-email">Email Address</label>
                            <input type="email" id="login-email" v-model="loginForm.email" placeholder="your@email.com"
                                required />
                        </div>

                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <div class="password-input">
                                <input :type="showPassword ? 'text' : 'password'" id="login-password"
                                    v-model="loginForm.password" placeholder="Enter your password" required />
                                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                                    {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                                </button>
                            </div>
                        </div>

                        <div class="form-options">
                            <label class="checkbox-label">
                                <input type="checkbox" v-model="loginForm.rememberMe" />
                                <span>Remember me</span>
                            </label>
                            <a href="#" class="forgot-link">Forgot password?</a>
                        </div>

                        <button type="submit" class="submit-btn">Sign In</button>

                        <div class="divider">
                            <span>OR</span>
                        </div>

                        <button type="button" class="social-btn google">
                            <span class="social-icon">G</span>
                            Continue with Google
                        </button>

                        <p class="toggle-text">
                            Don't have an account?
                            <a href="#" @click.prevent="toggleAuthMode">Register now</a>
                        </p>
                    </form>
                </div>

                <!-- Signup Form -->
                <div v-show="!isLogin" class="auth-form">
                    <h2 class="form-title">Create Wholesale Account</h2>
                    <p class="form-subtitle">Start ordering at wholesale prices</p>

                    <form @submit.prevent="handleSignup">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="business-name">Business Name *</label>
                                <input type="text" id="business-name" v-model="signupForm.businessName"
                                    placeholder="Your Shop Name" required />
                            </div>

                            <div class="form-group">
                                <label for="owner-name">Owner Name *</label>
                                <input type="text" id="owner-name" v-model="signupForm.ownerName" placeholder="John Doe"
                                    required />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-email">Email Address *</label>
                                <input type="email" id="signup-email" v-model="signupForm.email"
                                    placeholder="business@email.com" required />
                            </div>

                            <div class="form-group">
                                <label for="phone">Phone Number *</label>
                                <input type="tel" id="phone" v-model="signupForm.phone" placeholder="+66 XX XXX XXXX"
                                    required />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="tax-id">Tax ID / Business Registration</label>
                            <input type="text" id="tax-id" v-model="signupForm.taxId"
                                placeholder="Optional - for tax invoice" />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-password">Password *</label>
                                <div class="password-input">
                                    <input :type="showPassword ? 'text' : 'password'" id="signup-password"
                                        v-model="signupForm.password" placeholder="Min. 8 characters" required />
                                    <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                                        {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="confirm-password">Confirm Password *</label>
                                <div class="password-input">
                                    <input :type="showConfirmPassword ? 'text' : 'password'" id="confirm-password"
                                        v-model="signupForm.confirmPassword" placeholder="Re-enter password" required />
                                    <button type="button" class="toggle-password"
                                        @click="showConfirmPassword = !showConfirmPassword">
                                        {{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <label class="checkbox-label terms">
                            <input type="checkbox" v-model="signupForm.agreeToTerms" required />
                            <span>I agree to the <a href="#">Terms & Conditions</a> and <a href="#">Privacy
                                    Policy</a></span>
                        </label>

                        <button type="submit" class="submit-btn">Create Account</button>

                        <p class="toggle-text">
                            Already have an account?
                            <a href="#" @click.prevent="toggleAuthMode">Sign in</a>
                        </p>
                    </form>
                </div>
            </div>

            <!-- Footer Note -->
            <p class="footer-note">
                Need help? Contact us at <a href="mailto:wholesale@kitcharoen.com">wholesale@kitcharoen.com</a>
            </p>
        </div>
    </div>
</template>

<style scoped>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.auth-page {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 45% 55%;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Left Side - Branding */
.branding-section {
    background: linear-gradient(135deg, #8b6f47 0%, #b89968 100%);
    color: white;
    padding: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

.branding-content {
    position: relative;
    z-index: 2;
}

.logo {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
}

.logo-icon {
    font-size: 3rem;
    background: white;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo h1 {
    font-size: 2.5rem;
    font-weight: 700;
}

.tagline {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 16px;
    opacity: 0.95;
}

.description {
    font-size: 1.1rem;
    line-height: 1.7;
    opacity: 0.9;
    margin-bottom: 40px;
    max-width: 500px;
}

.benefits {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.benefit-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.05rem;
}

.benefit-icon {
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
}

.decorative-pattern {
    position: absolute;
    bottom: -100px;
    right: -100px;
    width: 400px;
    height: 400px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    z-index: 1;
}

.decorative-pattern::before {
    content: '';
    position: absolute;
    top: 50px;
    left: 50px;
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
}

/* Right Side - Form */
.form-section {
    background: #f8f9fa;
    padding: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.form-container {
    width: 100%;
    max-width: 500px;
    background: white;
    padding: 48px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.auth-form {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.form-title {
    font-size: 2rem;
    color: #2d2d2d;
    margin-bottom: 8px;
    font-weight: 700;
}

.form-subtitle {
    font-size: 1rem;
    color: #666;
    margin-bottom: 32px;
}

.form-group {
    margin-bottom: 24px;
    flex: 1;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #2d2d2d;
    margin-bottom: 8px;
}

input[type="text"],
input[type="email"],
input[type="password"],
input[type="tel"] {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.3s ease;
    outline: none;
}

input:focus {
    border-color: #8b6f47;
    box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
}

.password-input {
    position: relative;
}

.toggle-password {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 4px;
}

.form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #555;
    cursor: pointer;
    font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.checkbox-label.terms {
    margin-bottom: 24px;
}

.checkbox-label a {
    color: #8b6f47;
    text-decoration: none;
}

.checkbox-label a:hover {
    text-decoration: underline;
}

.forgot-link {
    font-size: 0.9rem;
    color: #8b6f47;
    text-decoration: none;
}

.forgot-link:hover {
    text-decoration: underline;
}

.submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #8b6f47, #b89968);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(139, 111, 71, 0.3);
}

.submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 111, 71, 0.4);
}

.divider {
    text-align: center;
    margin: 24px 0;
    position: relative;
}

.divider::before,
.divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #e0e0e0;
}

.divider::before {
    left: 0;
}

.divider::after {
    right: 0;
}

.divider span {
    background: white;
    padding: 0 16px;
    color: #999;
    font-size: 0.85rem;
    position: relative;
}

.social-btn {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    background: white;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.3s ease;
    margin-bottom: 24px;
}

.social-btn:hover {
    border-color: #8b6f47;
    background: #f8f9fa;
}

.social-icon {
    width: 24px;
    height: 24px;
    background: #4285f4;
    color: white;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
}

.toggle-text {
    text-align: center;
    font-size: 0.95rem;
    color: #666;
}

.toggle-text a {
    color: #8b6f47;
    text-decoration: none;
    font-weight: 600;
}

.toggle-text a:hover {
    text-decoration: underline;
}

.footer-note {
    margin-top: 32px;
    text-align: center;
    font-size: 0.9rem;
    color: #666;
}

.footer-note a {
    color: #8b6f47;
    text-decoration: none;
}

.footer-note a:hover {
    text-decoration: underline;
}

/* Responsive */
@media (max-width: 1024px) {
    .auth-page {
        grid-template-columns: 1fr;
    }

    .branding-section {
        padding: 40px;
        min-height: 300px;
    }

    .tagline {
        font-size: 1.5rem;
    }

    .description {
        font-size: 1rem;
    }
}

@media (max-width: 640px) {
    .form-section {
        padding: 30px 20px;
    }

    .form-container {
        padding: 32px 24px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .form-title {
        font-size: 1.5rem;
    }

    .logo h1 {
        font-size: 2rem;
    }
}
</style>