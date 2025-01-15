document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('messages-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    let isLoading = false;

    const isArabicText = (text) => {
        const arabicPattern = /[\u0600-\u06FF]/;
        return arabicPattern.test(text);
    };

    const createMessageElement = (content, role) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = content;
        
        if (isArabicText(content)) {
            messageDiv.dir = 'rtl';
        } else {
            messageDiv.dir = 'ltr';
        }
        
        return messageDiv;
    };

    const createTypingIndicator = () => {
        const typing = document.createElement('div');
        typing.className = 'typing';
        typing.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        return typing;
    };

    const appendMessage = (content, role) => {
        const messageElement = createMessageElement(content, role);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const processStreamResponse = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        const typing = createTypingIndicator();
        messagesContainer.appendChild(typing);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line) continue;

                if (line.startsWith('0:')) {
                    const content = line.slice(2).replace(/^"|"$/g, '');
                    buffer += content;
                    typing.textContent = buffer;
                } else if (line.startsWith('e:') || line.startsWith('d:')) {
                    typing.remove();
                    appendMessage(buffer, 'assistant');
                    buffer = '';
                }
            }
        }
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isLoading || !messageInput.value.trim()) return;

        const userMessage = messageInput.value.trim();
        messageInput.value = '';
        appendMessage(userMessage, 'user');
        isLoading = true;

        try {
            const response = await fetch('https://stream-breeze-921c.hoxepid178.workers.dev/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            await processStreamResponse(response);
        } catch (error) {
            console.error('Error:', error);
            appendMessage('Failed to send message. Please try again.', 'assistant');
        } finally {
            isLoading = false;
        }
    });

    // Check system dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }

    // Listen for system dark mode changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (e.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
});