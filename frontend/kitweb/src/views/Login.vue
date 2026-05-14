<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '../services/api';
import { authStore } from '../stores/authStore';

const router = useRouter();
const { t } = useI18n();

onMounted(() => {
    if (authStore.isAuthenticated) {
        router.push('/orderpage');
    }
});
const isLogin = ref(true);
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const showTermsModal = ref(false);

const toggleTermsModal = () => {
    showTermsModal.value = !showTermsModal.value;
};

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

const handleLogin = async () => {
    isLoading.value = true;
    try {
        const response = await api.login({
            email: loginForm.value.email,
            password: loginForm.value.password
        });

        if (response.success) {
            authStore.login(response.user, response.token);
            router.push('/orderpage');
        }
    } catch (error) {
        alert(error.message || t('auth.loginFailed'));
    } finally {
        isLoading.value = false;
    }
};

const handleSignup = async () => {
    if (signupForm.value.password !== signupForm.value.confirmPassword) {
        alert(t('auth.passwordsDoNotMatch'));
        return;
    }
    if (!signupForm.value.agreeToTerms) {
        alert(t('auth.agreeTermsError'));
        return;
    }

    isLoading.value = true;
    try {
        const response = await api.signup({
            email: signupForm.value.email,
            password: signupForm.value.password,
            businessName: signupForm.value.businessName,
            ownerName: signupForm.value.ownerName,
            phone: signupForm.value.phone,
            taxId: signupForm.value.taxId
        });

        if (response.success) {
            alert(t('auth.accountCreated'));
            isLogin.value = true;
        }
    } catch (error) {
        alert(error.message || t('auth.signupFailed'));
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="auth-page">
        <!-- Left Side - Branding -->
        <div class="branding-section">
            <div class="branding-overlay"></div>
            <div class="branding-content">
                <p class="since">{{ t('auth.since') }}</p>
                <h1 class="brand-name" v-html="t('auth.brandName')"></h1>
                <p class="brand-description">
                    {{ t('auth.brandDesc') }}
                </p>
            </div>
        </div>

        <!-- Right Side - Auth Forms -->
        <div class="form-section">
            <div class="form-container">
                <!-- Login Form -->
                <div v-if="isLogin" class="auth-form">
                    <h2 class="form-title">{{ t('auth.signIn') }}</h2>
                    <p class="form-subtitle">{{ t('auth.signInSubtitle') }}</p>

                    <form @submit.prevent="handleLogin">
                        <div class="form-group">
                            <label for="login-email">{{ t('auth.emailLabel') }}</label>
                            <div class="input-wrapper">
                                <input type="email" id="login-email" v-model="loginForm.email"
                                    :placeholder="t('auth.emailPlaceholder')" required />
                                <ion-icon name="mail-outline" class="input-icon"></ion-icon>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="label-row">
                                <label for="login-password">{{ t('auth.passwordLabel') }}</label>
                                <a href="#" class="forgot-link">{{ t('auth.forgotPassword') }}</a>
                            </div>
                            <div class="input-wrapper">
                                <input :type="showPassword ? 'text' : 'password'" id="login-password"
                                    v-model="loginForm.password" :placeholder="t('auth.passwordPlaceholder')"
                                    required />
                                <ion-icon :name="showPassword ? 'eye-outline' : 'eye-off-outline'"
                                    class="input-icon clickable" @click="showPassword = !showPassword"></ion-icon>
                            </div>
                        </div>

                        <div class="form-options">
                            <label class="checkbox-container">
                                <input type="checkbox" v-model="loginForm.rememberMe" />
                                <span class="checkmark"></span>
                                {{ t('auth.rememberMe') }}
                            </label>
                        </div>

                        <button type="submit" class="submit-btn" :disabled="isLoading">
                            <span v-if="isLoading" class="loader-small"></span>
                            <span v-else>{{ t('auth.signIn') }} <ion-icon
                                    name="arrow-forward-outline"></ion-icon></span>
                        </button>

                        <div class="divider">
                            <span>{{ t('auth.or') }}</span>
                        </div>

                        <div class="signup-prompt">
                            <p>{{ t('auth.newToCommunity') }}</p>
                            <button type="button" class="join-btn" @click="toggleAuthMode">
                                {{ t('auth.joinHeritage') }} <ion-icon name="ribbon-outline"></ion-icon>
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Signup Form -->
                <div v-else class="auth-form">
                    <h2 class="form-title compact">{{ t('auth.joinUs') }}</h2>
                    <p class="form-subtitle compact">{{ t('auth.wholesaleSubtitle') }}</p>

                    <form @submit.prevent="handleSignup">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="business-name">{{ t('auth.businessName') }}</label>
                                <div class="input-wrapper">
                                    <input type="text" id="business-name" v-model="signupForm.businessName"
                                        :placeholder="t('auth.businessPlaceholder')" required />
                                    <ion-icon name="business-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="owner-name">{{ t('auth.ownerName') }}</label>
                                <div class="input-wrapper">
                                    <input type="text" id="owner-name" v-model="signupForm.ownerName"
                                        :placeholder="t('auth.ownerPlaceholder')" required />
                                    <ion-icon name="person-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-email">{{ t('auth.email') }}</label>
                                <div class="input-wrapper">
                                    <input type="email" id="signup-email" v-model="signupForm.email"
                                        :placeholder="t('auth.emailPlaceholder')" required />
                                    <ion-icon name="mail-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="phone">{{ t('auth.phone') }}</label>
                                <div class="input-wrapper">
                                    <input type="tel" id="phone" v-model="signupForm.phone"
                                        :placeholder="t('auth.phonePlaceholder')" required />
                                    <ion-icon name="call-outline" class="input-icon"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="tax-id">{{ t('auth.taxId') }}</label>
                            <div class="input-wrapper">
                                <input type="text" id="tax-id" v-model="signupForm.taxId"
                                    :placeholder="t('auth.taxIdPlaceholder')" />
                                <ion-icon name="document-text-outline" class="input-icon"></ion-icon>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="signup-password">{{ t('auth.passwordLabel') }}</label>
                                <div class="input-wrapper">
                                    <input :type="showPassword ? 'text' : 'password'" id="signup-password"
                                        v-model="signupForm.password" :placeholder="t('auth.passwordPlaceholder')"
                                        required />
                                    <ion-icon :name="showPassword ? 'eye-outline' : 'eye-off-outline'"
                                        class="input-icon clickable" @click="showPassword = !showPassword"></ion-icon>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="confirm-password">{{ t('auth.confirmPassword') }}</label>
                                <div class="input-wrapper">
                                    <input :type="showConfirmPassword ? 'text' : 'password'" id="confirm-password"
                                        v-model="signupForm.confirmPassword"
                                        :placeholder="t('auth.passwordPlaceholder')" required />
                                    <ion-icon :name="showConfirmPassword ? 'eye-outline' : 'eye-off-outline'"
                                        class="input-icon clickable"
                                        @click="showConfirmPassword = !showConfirmPassword"></ion-icon>
                                </div>
                            </div>
                        </div>

                        <div class="form-options compact">
                            <label class="checkbox-container terms">
                                <input type="checkbox" v-model="signupForm.agreeToTerms" />
                                <span class="checkmark"></span>
                                <span class="terms-text">{{ t('auth.agreeToTerms') }} <a href="#"
                                        @click.prevent="toggleTermsModal">{{ t('auth.terms') }}</a></span>
                            </label>
                        </div>

                        <button type="submit" class="submit-btn compact" :disabled="isLoading">
                            <span v-if="isLoading" class="loader-small"></span>
                            <span v-else>{{ t('auth.createAccount') }}</span>
                        </button>

                        <div class="divider compact">
                            <span>{{ t('auth.or') }}</span>
                        </div>

                        <div class="signup-prompt">
                            <button type="button" class="join-btn compact" @click="toggleAuthMode">
                                {{ t('auth.signIn') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="watermark">
                <ion-icon name="ribbon-outline"></ion-icon>
            </div>

            <footer class="form-footer">
                {{ t('auth.footer') }}
            </footer>
        </div>

        <!-- Terms Modal -->
        <transition name="fade">
            <div v-if="showTermsModal" class="modal-overlay" @click="toggleTermsModal">
                <div class="terms-modal" @click.stop>
                    <div class="modal-header">
                        <h3>{{ t('auth.termsTitle') }}</h3>
                        <button class="close-btn" @click="toggleTermsModal">
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>{{ t('auth.termsContent') }}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-submit" @click="toggleTermsModal">Close</button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
.auth-page {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 45% 55%;
    background: #fff;
    font-family: 'Inter', sans-serif;
    box-sizing: border-box;
}

.auth-page *,
.auth-page *::before,
.auth-page *::after {
    box-sizing: border-box;
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
    padding-bottom: 5rem;
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
    padding: 60px 30px;
    min-height: 100vh;
}

.form-container {
    width: 100%;
    max-width: 530px;
    z-index: 2;
    margin: auto 0;
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
    position: relative;
    margin-top: 40px;
    font-size: 12px;
    color: #A0948C;
    text-align: center;
    width: 100%;
    padding-bottom: 20px;
}

.loader-small {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
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
        padding: 60px 20px;
    }

    .watermark {
        display: none;
    }
}

@media (max-width: 640px) {
    .form-section {
        padding: 40px 15px;
    }

    .form-container {
        padding: 0 5px;
    }

    .form-row {
        grid-template-columns: 1fr;
        gap: 0;
    }

    .form-title {
        font-size: 28px;
    }

    .form-title.compact {
        font-size: 24px;
    }

    .submit-btn,
    .join-btn {
        padding: 12px;
    }
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.terms-modal {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    font-family: 'ZCOOL XiaoWei', serif;
    font-size: 24px;
    color: #2D241E;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #A0948C;
}

.modal-body {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 25px;
    line-height: 1.6;
    color: #6B5D54;
}

.modal-submit {
    width: 100%;
    padding: 12px;
    background: #006666;
    color: white;
    border: none;
    border-radius: 50px;
    font-weight: 700;
    cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>