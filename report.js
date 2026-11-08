const showLostFormButton = document.getElementById('showLostFormButton');
const showFoundFormButton = document.getElementById('showFoundFormButton');
const iframe = document.querySelector('iframe');
const formContainer = document.getElementById('formContainer');

showLostFormButton.addEventListener('click', () => {
    console.log('Toggling form visibility');
    formContainer.classList.toggle('hidden');
    formContainer.classList.toggle('visible');
});

showFoundFormButton.addEventListener('click', () => {
    console.log('Toggling form visibility');
    formContainer.classList.toggle('hidden');
    formContainer.classList.toggle('visible');
});