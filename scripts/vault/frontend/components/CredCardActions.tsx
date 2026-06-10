import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

interface Props {
  shown: boolean
  rotating: boolean
  hasPw: boolean
  onToggleShown: () => void
  onCopy: () => void
  onRotate: () => void
  editHref?: string
  onDelete?: () => Promise<void>
}

export function CredCardActions({
  shown, rotating, hasPw,
  onToggleShown, onCopy, onRotate,
  editHref, onDelete,
}: Props) {
  const { t } = useTranslation()
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small" variant="outlined"
          onClick={onToggleShown}
          disabled={!hasPw}
          sx={{ minWidth: 60 }}
        >
          {shown ? t('cred.hide') : t('cred.show')}
        </Button>
        <Button
          size="small" variant="outlined"
          onClick={onCopy} disabled={!hasPw}
        >
          {t('cred.copy')}
        </Button>
        <Button
          size="small" variant="contained"
          onClick={onRotate} disabled={rotating}
          sx={{ ml: 'auto' }}
        >
          {rotating ? '…' : t('cred.rotate')}
        </Button>
      </Box>
      {(editHref || onDelete) && (
        <>
          <Divider sx={{ mt: 2, mb: 1.5 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {editHref && (
              <Button
                size="small"
                startIcon={<EditIcon />}
                component={Link}
                href={editHref}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="small" color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={onDelete}
                sx={{ ml: 'auto' }}
              >
                Delete
              </Button>
            )}
          </Box>
        </>
      )}
    </>
  )
}
