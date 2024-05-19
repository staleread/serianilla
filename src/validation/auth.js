const validator = {
    'username': {
        keys: ['username'],
        validate: (username) => {
            const USERNAME_MIN_LENGTH = 3;
            const USERNAME_MAX_LENGTH = 15;

            if (username === '') {
                return `Username is required`
            }
            if (username.length < USERNAME_MIN_LENGTH) {
                return `Username with at least ${USERNAME_MIN_LENGTH} characters expected`;
            }
            if (username.length > USERNAME_MAX_LENGTH) {
                return `Username's max length is ${USERNAME_MAX_LENGTH}`;
            }
            return '';
        }
    },
    'email': {
        keys: ['email'],
        validate: (email) => {
            const EMAIL_REG = /[a-z0-9]+(\.[a-z0-9]+)*@[a-z0-9]+\.[a-z0-9]+/i;

            if (email === '') {
                return 'Email is required';
            }
            if (!EMAIL_REG.test(email)) {
                return 'Email must follow the format "___@___.___"';
            }
            return '';
        }
    },
    'password': {
        keys: ['password'],
        validate: (password) => {
            const PASSWORD_MAX_LENGTH = 5;

            if (password === '') {
                return 'Password is required';
            }
            if (password.length > PASSWORD_MAX_LENGTH) {
                return `Password's max length is ${PASSWORD_MAX_LENGTH}`;
            }
            return '';
        }
    },
    'repeat-password': {
        keys: ['password', 'repeat-password'],
        validate: (password, repeatPassword) => {
            const PASSWORD_MAX_LENGTH = 5;

            if (repeatPassword === '') {
                return 'Password is required';
            }
            if (repeatPassword.length > PASSWORD_MAX_LENGTH) {
                return `Password's max length is ${PASSWORD_MAX_LENGTH}`;
            }
            if (password !== repeatPassword) {
                return 'Passwords should match';
            }
            return '';
        },
    }
}

export const validateFormData = (formData) => {
    const errorEntries = [];

    for (const [key, value] of formData.entries()) {
        if (!validator[key]) {
            errorEntries.push([key, '']);
            continue;
        }
        const keys = validator[key].keys;
        const values = keys.map(key => formData.get(key));

        errorEntries.push([key, validator[key].validate(...values)]);
    }
    return errorEntries;
}