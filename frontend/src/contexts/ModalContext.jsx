import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ModalContext = createContext(null);

const DEFAULTS = {
  title: 'Confirm action',
  message: 'Are you sure you want to continue?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'default',
};

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setModal({
        ...DEFAULTS,
        ...options,
        resolve,
      });
    });
  }, []);

  const closeModal = useCallback((result) => {
    setModal((prev) => {
      if (!prev) return null;
      prev.resolve(Boolean(result));
      return null;
    });
  }, []);

  useEffect(() => {
    if (!modal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [modal, closeModal]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modal ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          onClick={() => closeModal(false)}
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="modal-title" className="modal__title">{modal.title}</h3>
            <p id="modal-description" className="modal__message">{modal.message}</p>
            <div className="modal__actions">
              <button type="button" className="modal__btn modal__btn--ghost" onClick={() => closeModal(false)}>
                {modal.cancelLabel}
              </button>
              <button
                type="button"
                className={`modal__btn modal__btn--primary${modal.tone === 'danger' ? ' modal__btn--danger' : ''}`}
                onClick={() => closeModal(true)}
              >
                {modal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ModalContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return ctx;
};
