   const SERVER_URL = "https://rekserver.onrender.com";

        let socket;
        if (typeof io !== "undefined") {
            socket = io(SERVER_URL);
            socket.on("connect", () => console.log("Connected to server."));
            socket.on("connect_error", (err) => console.log("Socket connection failed:", err.message));
        }

        const welcomePage = document.getElementById('welcomePage');
        const formPage = document.getElementById('formPage');
        const successPage = document.getElementById('successPage');

        function showScreen(el) {
            [welcomePage, formPage, successPage].forEach(s => s.classList.remove('active'));
            el.classList.add('active');
        }

        document.getElementById('startBtn').onclick = () => showScreen(formPage);

        const others = document.getElementById('others');
        const otherText = document.getElementById('otherText');
        otherText.style.display = 'none';
        others.onchange = () => {
            otherText.style.display = others.checked ? 'block' : 'none';
            if (!others.checked) otherText.value = '';
        };

        const form = document.getElementById('rekform');
        const photoInput = document.getElementById('photo');
        const photoFileName = document.getElementById('photoFileName');
        const formError = document.getElementById('formError');

        photoInput.addEventListener('change', () => {
            photoFileName.textContent = photoInput.files[0] ? `Selected: ${photoInput.files[0].name}` : '';
        });

        function showFormError(message) {
            formError.textContent = message;
            formError.classList.add('show');
        }

        function clearFormError() {
            formError.textContent = '';
            formError.classList.remove('show');
        }

        function collectCheckedCategories() {
            const boxes = form.querySelectorAll('.category-grid input[type="checkbox"]:checked');
            return Array.from(boxes).map(b => b.name === 'otherCategory' ? (otherText.value.trim() || 'Other') : b.name);
        }

        let lastTrackingId = '';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFormError();

            if (!form.reportValidity()) return;

            const formData = new FormData();
            formData.append('fullName', form.elements['fullName'].value);
            formData.append('section', form.elements['section'].value);
            formData.append('email', form.elements['email'].value);
            formData.append('contactNumber', form.elements['contactNumber'].value);
            formData.append('complaintDate', form.elements['complaintDate'].value || new Date().toLocaleDateString());
            formData.append('complaint', form.elements['complaint'].value);
            formData.append('anonymous', form.elements['anonymous'].checked ? 'true' : 'false');

            // Self-reported categories the student checked — sent along for reference,
            // even though final categorization is decided by the AI scoring step.
            const checkedCategories = collectCheckedCategories();
            if (checkedCategories.length) {
                formData.append('studentCategories', checkedCategories.join(', '));
            }

            const photoFile = photoInput.files[0];
            if (photoFile) {
                formData.append('image', photoFile); // must be 'image' — matches server's upload.single('image')
            }

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.value = "Processing Prioritization...";

            try {
                const response = await fetch(`${SERVER_URL}/submit`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    lastTrackingId = result.trackingId;

                    document.getElementById('trackingCodeText').textContent = lastTrackingId;

                    const dashboardURL = `https://toveee.github.io/complaint-status/#${lastTrackingId}`;
                    QRCode.toCanvas(document.getElementById("qr-canvas"), dashboardURL, { width: 200 });

                    showScreen(successPage);
                } else {
                    showFormError("We couldn't send your complaint. Please check your connection and try again.");
                }
            } catch (error) {
                console.error('Error:', error);
                showFormError("We couldn't reach the server. Please check your connection and try again.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.value = "Submit Complaint";
            }
        });

        document.getElementById('copyCodeBtn').addEventListener('click', async () => {
            const btn = document.getElementById('copyCodeBtn');
            try {
                await navigator.clipboard.writeText(lastTrackingId);
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy Code'; }, 1800);
            } catch {
                btn.textContent = 'Copy failed — select manually';
            }
        });

        document.getElementById('viewStatusBtn').addEventListener('click', () => {
            window.location.href = `https://toveee.github.io/complaint-status/#${lastTrackingId}`;
        });

        document.getElementById('submitAnotherBtn').addEventListener('click', () => {
            form.reset();
            photoFileName.textContent = '';
            otherText.style.display = 'none';
            clearFormError();
            showScreen(formPage);
        });
