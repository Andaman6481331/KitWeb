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
            <div class="branding-overlay"></div>
            <div class="branding-content">
                <p class="since">SINCE 1984</p>
                <h1 class="brand-name">Kitcharoen<br>Haberdashery</h1>
                <p class="brand-description">
                    A legacy of artisanal quality and traditional Thai craftsmanship,
                    preserved for the modern maker. Welcome back to the house of Heritage Craft & Stitch.
                </p>
            </div>
        </div>

        <!-- Right Side - Auth Forms -->
        <div class="form-section">
            <div class="form-container">
                <!-- Login Form -->
                <div v-if="isLogin" class="auth-form">
                    <h2 class="form-title">Sign In</h2>
                    <p class="form-subtitle">Enter your details to access your account.</p>

                    <form @submit.prevent="handleLogin">
                        <div class="form-group">
                            <label for="login-email">Email Address</label>
                            <div class="input-wrapper">
                                <input type="email" id="login-email" v-model="loginForm.email"
                                    placeholder="weaver@heritage.com" required />
                                <ion-icon name="mail-outline" class="input-icon"></ion-icon>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="label-row">
                                <label for="login-password">Password</label>
                                <a href="#" class="forgot-link">Forgot Password?</a>
                            </div>
                            <div class="input-wrapper">
                                <input :type="showPassword ? 'text' : 'password'" id="login-password"
                                    v-model="loginForm.password" placeholder="••••••••" required />
                                <ion-icon :name="showPassword ? 'eye-outline' : 'eye-off-outline'"
                                    class="input-icon clickable" @click="showPassword = !showPassword"></ion-icon>
                            </div>
                        </div>

                        <div class="form-options">
                            <label class="checkbox-container">
                                <input type="checkbox" v-model="loginForm.rememberMe" />
                                <span class="checkmark"></span>
                                Remember Me
                            </label>
                        </div>

                        <button type="submit" class="submit-btn">
                            Sign In <ion-icon name="arrow-forward-outline"></ion-icon>
                        </button>

                        <div class="divider">
                            <span>OR</span>
                        </div>

                        <div class="signup-prompt">
                            <p>New to our community?</p>
                            <button type="button" class="join-btn" @click="toggleAuthMode">
                                Join the Heritage <ion-icon name="ribbon-outline"></ion-icon>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Signup Form -->
                <div v-else class="auth-form">
                    <h2 class="form-title compact">Join us</h2>
                    <p class="form-subtitle compact">Apply for a wholesale account.</p>

                    <form @submit.prevent="handleSignup">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="business-name">Business Name</label>
                                <div class="input-wrapper">
                                    <input type="text" id="business-name" v-model="signupForm.businessName"
                                        placeholder="Shop Name" required />
                                    <ion-icon name="business-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="owner-name">Owner Name</label>
                                <div class="input-wrapper">
                                    <input type="text" id="owner-name" v-model="signupForm.ownerName" placeholder="Name"
                                        required />
                                    <ion-icon name="person-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-email">Email</label>
                                <div class="input-wrapper">
                                    <input type="email" id="signup-email" v-model="signupForm.email"
                                        placeholder="email@com" required />
                                    <ion-icon name="mail-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="phone">Phone</label>
                                <div class="input-wrapper">
                                    <input type="tel" id="phone" v-model="signupForm.phone" placeholder="+66 XX"
                                        required />
                                    <ion-icon name="call-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="tax-id">Tax ID (Optional)</label>
                            <div class="input-wrapper">
                                <input type="text" id="tax-id" v-model="signupForm.taxId" placeholder="Reg. Number" />
                                <ion-icon name="document-text-outline" class="input-icon"></ion-icon>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-password">Password</label>
                                <div class="input-wrapper">
                                    <input :type="showPassword ? 'text' : 'password'" id="signup-password"
                                        v-model="signupForm.password" placeholder="••••" required />
                                    <ion-icon :name="showPassword ? 'eye-outline' : 'eye-off-outline'"
                                        class="input-icon clickable" @click="showPassword = !showPassword"></ion-icon>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="confirm-password">Confirm</label>
                                <div class="input-wrapper">
                                    <input :type="showConfirmPassword ? 'text' : 'password'" id="confirm-password"
                                        v-model="signupForm.confirmPassword" placeholder="••••" required />
                                    <ion-icon :name="showConfirmPassword ? 'eye-outline' : 'eye-off-outline'"
                                        class="input-icon clickable"
                                        @click="showConfirmPassword = !showConfirmPassword"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div class="form-options compact">
                            <label class="checkbox-container terms">
                                <input type="checkbox" v-model="signupForm.agreeToTerms" required />
                                <span class="checkmark"></span>
                                <span class="terms-text">I agree to the <a href="#">Terms</a></span>
                            </label>
                        </div>

                        <button type="submit" class="submit-btn compact">
                            Create Account
                        </button>

                        <div class="divider compact">
                            <span>OR</span>
                        </div>

                        <div class="signup-prompt">
                            <button type="button" class="join-btn compact" @click="toggleAuthMode">
                                Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="watermark">
                <ion-icon name="ribbon-outline"></ion-icon>
            </div>

            <footer class="form-footer">
                © 1984 Kitcharoen Haberdashery. Artisanal quality for generations.
            </footer>
        </div>
    </div>
</template>

<style scoped>
.auth-page {
    height: 100vh;
    display: grid;
    grid-template-columns: 45% 55%;
    background: #fff;
    font-family: 'Inter', sans-serif;
    overflow: hidden;
}

/* Left Side - Branding */
.branding-section {
    position: relative;
    background-image: url('../assets/texture-bg03.jpg');
    background-size: cover;
    background-position: center;
    padding: 80px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    color: white;
}

.branding-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(84, 61, 47, 0.7);
    /* Warm brownish overlay */
    backdrop-filter: blur(4px);
    z-index: 1;
}

.branding-content {
    position: relative;
    z-index: 2;
    max-width: 500px;
}

.since {
    font-size: 14px;
    letter-spacing: 4px;
    font-weight: 700;
    margin-bottom: 12px;
    opacity: 0.9;
}

.brand-name {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 56px;
    line-height: 1.1;
    margin-bottom: 16px;
    font-weight: normal;
}

.brand-description {
    font-size: 16px;
    line-height: 1.5;
    opacity: 0.85;
    font-weight: 300;
}

/* Right Side - Form Section */
.form-section {
    position: relative;
    background: #FFFAF6;
    /* Slightly off-white/warm */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 15px 30px;
}

.form-container {
    width: 100%;
    max-width: 530px;
    z-index: 2;
}

.auth-form {
    animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.form-title {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 36px;
    color: #2D241E;
    margin-bottom: 4px;
}

.form-title.compact {
    font-size: 28px;
}

.form-subtitle {
    font-size: 14px;
    color: #6B5D54;
    margin-bottom: 20px;
}

.form-subtitle.compact {
    margin-bottom: 12px;
}

.form-group {
    margin-bottom: 12px;
}

.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

label {
    font-size: 13px;
    font-weight: 600;
    color: #4A3F35;
}

.input-wrapper {
    position: relative;
}

input {
    width: 100%;
    padding: 12px;
    background: #F3EEEA;
    border: 1px solid transparent;
    border-radius: 10px;
    font-size: 14px;
    color: #2D241E;
    transition: all 0.3s ease;
    outline: none;
}

input:focus {
    background: #fff;
    border-color: #006666;
    box-shadow: 0 0 0 4px rgba(0, 102, 102, 0.05);
}

.input-icon {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
    color: #A0948C;
}

.input-icon.clickable {
    cursor: pointer;
}

.input-icon.clickable:hover {
    color: #006666;
}

.forgot-link {
    font-size: 12px;
    font-weight: 600;
    color: #006666;
    text-decoration: none;
}

.form-options {
    margin-bottom: 20px;
}

.form-options.compact {
    margin-bottom: 12px;
}

/* Custom Checkbox */
.checkbox-container {
    display: flex;
    align-items: center;
    position: relative;
    padding-left: 30px;
    cursor: pointer;
    font-size: 14px;
    color: #4A3F35;
    user-select: none;
}

.checkbox-container input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
}

.checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 20px;
    width: 20px;
    background-color: #F3EEEA;
    border-radius: 6px;
    transition: all 0.2s;
}

.checkbox-container:hover input~.checkmark {
    background-color: #E8E2DD;
}

.checkbox-container input:checked~.checkmark {
    background-color: #006666;
}

.checkmark:after {
    content: "";
    position: absolute;
    display: none;
}

.checkbox-container input:checked~.checkmark:after {
    display: block;
}

.checkbox-container .checkmark:after {
    left: 7px;
    top: 3px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.submit-btn {
    width: 100%;
    padding: 14px;
    background: #006666;
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.3s ease;
    box-shadow: 0 10px 20px rgba(0, 102, 102, 0.15);
}

.submit-btn.compact {
    padding: 12px;
}

.submit-btn:hover {
    background: #004d4d;
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(0, 102, 102, 0.2);
}

.divider {
    margin: 20px 0;
    position: relative;
    text-align: center;
}

.divider.compact {
    margin: 12px 0;
}

.divider:before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 1px;
    background: #E8E2DD;
    z-index: 1;
}

.divider span {
    position: relative;
    z-index: 2;
    background: #FFFAF6;
    padding: 0 20px;
    font-size: 12px;
    font-weight: 700;
    color: #A0948C;
    letter-spacing: 2px;
}

.signup-prompt {
    text-align: center;
}

.signup-prompt p {
    font-size: 14px;
    color: #6B5D54;
    margin-bottom: 8px;
}

.join-btn {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 1px solid #E8E2DD;
    border-radius: 50px;
    color: #2D241E;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.join-btn.compact {
    padding: 10px;
}

.join-btn:hover {
    background: #fff;
    border-color: #006666;
    color: #006666;
}

/* Signup Row */
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.terms-text a {
    color: #006666;
    text-decoration: none;
    font-weight: 600;
}

.watermark {
    position: absolute;
    bottom: 60px;
    right: 60px;
    font-size: 120px;
    color: #2D241E;
    opacity: 0.03;
    pointer-events: none;
}

.form-footer {
    position: absolute;
    bottom: 30px;
    font-size: 12px;
    color: #A0948C;
    text-align: center;
    width: 100%;
}

/* Responsive */
@media (max-width: 1200px) {
    .auth-page {
        grid-template-columns: 40% 60%;
    }
}

@media (max-width: 1024px) {
    .auth-page {
        grid-template-columns: 1fr;
    }

    .branding-section {
        display: none;
    }

    .form-section {
        padding: 40px 20px;
    }
}

@media (max-width: 640px) {
    .form-row {
        grid-template-columns: 1fr;
    }

    .form-title {
        font-size: 32px;
    }

    .submit-btn,
    .join-btn {
        padding: 14px;
    }
}
</style>