import { Snackbar, Alert, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function ToastContainer({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => {}}
          style={{ marginBottom: 8 }}
        >
          <Alert
            severity={toast.type}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => {}}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </div>
  )
}