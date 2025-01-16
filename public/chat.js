document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('messages-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    let isLoading = false;

    const isArabicText = (text) => {
        const arabicPattern = /[\u0600-\u06FF]/;
        return arabicPattern.test(text);
    };

    const formatMessage = (content) => {
        // Handle double line breaks first
        content = content.replace(/\\n\\n/g, '</p><p>');
        // Handle single line breaks
        content = content.replace(/\\n/g, '<br>');
        // Handle bold text
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Remove any extra quotes that might have been added by JSON
        content = content.replace(/\\"/g, '"');
        // Remove markdown headers
        content = content.replace(/###\s/g, '');
        
        return content;
    };

    const createMessageElement = (content, role) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        // Wrap content in paragraph tags and handle formatting
        messageDiv.innerHTML = `<p>${formatMessage(content)}</p>`;
        
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
        typing.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loader"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
        return typing;
    };

    const scrollToBottom = () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const appendMessage = (content, role) => {
        const messageElement = createMessageElement(content, role);
        messagesContainer.appendChild(messageElement);
        scrollToBottom();
    };

    const processStreamResponse = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        const typing = createTypingIndicator();
        messagesContainer.appendChild(typing);
        scrollToBottom();

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
                    typing.innerHTML = `<p>${formatMessage(buffer)}</p>`;
                    scrollToBottom();
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