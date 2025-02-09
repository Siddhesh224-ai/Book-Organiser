const API_URL = "https://www.googleapis.com/books/v1/volumes?q=";
        const LIBRARY_STORAGE_KEY = "myBookLibrary";

        class BookLibrary {
            constructor() {
                this.myLibrary = this.loadLibrary();
                this.searchResults = [];
                this.initializeElements();
                this.bindEvents();
                this.renderLibrary();
            }

            initializeElements() {
                this.searchInput = document.getElementById('searchInput');
                this.searchButton = document.getElementById('searchButton');
                this.searchResultsContainer = document.querySelector('#searchResults .books-grid');
                this.categoryContainers = {
                    toRead: document.querySelector('#toRead .books-grid'),
                    reading: document.querySelector('#reading .books-grid'),
                    completed: document.querySelector('#completed .books-grid')
                };
                this.genreSelect = document.getElementById('genreSelect'); // Get the select element
            }

            bindEvents() {
                this.searchButton.addEventListener('click', () => this.searchBooks());
                this.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchBooks();
                });
                this.genreSelect.addEventListener('change', () => this.filterByGenre());
            }

            async searchBooks() {
                const query = this.searchInput.value.trim();
                const genre = this.genreSelect.value;

                let apiUrl = API_URL;
                if (query) {
                    apiUrl += encodeURIComponent(query);
                    if (genre) {
                        apiUrl += `+subject:${encodeURIComponent(genre)}`;
                    }
                } else if (genre) {
                    apiUrl += `subject:${encodeURIComponent(genre)}`;
                } else {
                    return; // if no query and no genre selected, do nothing.
                }

                try {
                    const response = await fetch(apiUrl);
                    const data = await response.json();
                    this.searchResults = data.items || [];
                    this.renderSearchResults();
                } catch (error) {
                    console.error('Error searching books:', error);
                    this.searchResultsContainer.innerHTML = '<p>Error searching books. Please try again.</p>';
                }
            }

            renderSearchResults() {
                this.searchResultsContainer.innerHTML = '';

                this.searchResults.forEach(book => {
                    const volumeInfo = book.volumeInfo;
                    const bookCard = this.createBookCard({
                        id: book.id,
                        title: volumeInfo.title,
                        authors: volumeInfo.authors?.join(', ') || 'Unknown Author',
                        coverUrl: volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover',
                        volumeInfo: volumeInfo, // Pass volumeInfo to createBookCard
                        isLibraryBook: false
                    });
                    this.searchResultsContainer.appendChild(bookCard);
                });
            }


            filterByGenre() {
                const selectedGenre = this.genreSelect.value;
                if (!selectedGenre) {
                    this.renderLibrary();
                    return;
                }

                const filteredLibrary = this.myLibrary.filter(book => {
                    return book.genre && book.genre.includes(selectedGenre);
                });

                Object.values(this.categoryContainers).forEach(container => {
                    container.innerHTML = '';
                });

                filteredLibrary.forEach(book => {
                    const bookCard = this.createBookCard({
                        ...book,
                        isLibraryBook: true
                    });
                    this.categoryContainers[book.category].appendChild(bookCard);
                });
            }

            createBookCard(book) {
                const card = document.createElement('div');
                card.className = 'book-card';

                const isInLibrary = this.myLibrary.some(libBook => libBook.id === book.id);

                let genres = "";
                if (book.volumeInfo && book.volumeInfo.categories) {
                    genres = book.volumeInfo.categories.join(", ");
                } else if (book.genre) {
                    genres = book.genre;
                }

                card.innerHTML = `
                    <img src="${book.coverUrl}" alt="${book.title} cover">
                    <h3>${book.title}</h3>
                    <p>${book.authors}</p>
                    <p>Genre: ${genres}</p>
                    <div class="book-actions">
                        ${book.isLibraryBook ? `
                            <select class="category-select">
                                <option value="toRead" ${book.category === 'toRead' ? 'selected' : ''}>To Read</option>
                                <option value="reading" ${book.category === 'reading' ? 'selected' : ''}>Reading</option>
                                <option value="completed" ${book.category === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                            <button class="remove-btn">Remove</button>
                        ` : `
                            <button class="save-btn" ${isInLibrary ? 'disabled' : ''}>
                                ${isInLibrary ? 'Already Saved' : 'Save to Library'}
                            </button>
                        `}
                    </div>
                `;

                if (book.isLibraryBook) {
                    const select = card.querySelector('.category-select');
                    const removeBtn = card.querySelector('.remove-btn');

                    select.addEventListener('change', (e) => {
                        this.moveBook(book.id, e.target.value);
                    });

                    removeBtn.addEventListener('click', () => {
                        this.removeBook(book.id);
                    });
                } else {
                    const saveBtn = card.querySelector('.save-btn');
                    if (!isInLibrary) {
                        saveBtn.addEventListener('click', () => {
                            this.addBook({
                                id: book.id,
                                title: book.title,
                                authors: book.authors,
                                coverUrl: book.coverUrl,
                                volumeInfo: book.volumeInfo, // Pass volumeInfo when adding
                                category: 'toRead'
                            });
                            saveBtn.disabled = true;
                            saveBtn.textContent = 'Already Saved';
                        });
                    }
                }

                return card;
            }

            addBook(book) {
                if (book.volumeInfo && book.volumeInfo.categories) {
                    book.genre = book.volumeInfo.categories.join(", ");
                } else {
                    book.genre = "";
                }

                this.myLibrary.push(book);
                this.saveLibrary();
                this.renderLibrary();
            }

            removeBook(bookId) {
                this.myLibrary = this.myLibrary.filter(book => book.id !== bookId);
                this.saveLibrary();
                this.renderLibrary();
            }

            moveBook(bookId, newCategory) {
                const book = this.myLibrary.find(book => book.id === bookId);
                if (book) {
                    book.category = newCategory;
                    this.saveLibrary();
                    this.renderLibrary();
                }
            }

            renderLibrary() {
                Object.values(this.categoryContainers).forEach(container => {
                    container.innerHTML = '';
                });

                this.myLibrary.forEach(book => {
                    const bookCard = this.createBookCard({
                        ...book,
                        isLibraryBook: true
                    });
                    this.categoryContainers[book.category].appendChild(bookCard);
                });
            }

            loadLibrary() {
                const savedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
                return savedLibrary ? JSON.parse(savedLibrary) : [];
            }

            saveLibrary() {
                localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(this.myLibrary));
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new BookLibrary();
        });