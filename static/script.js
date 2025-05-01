let deleteFile = function(fileName) {
  let ok = confirm(`Permanently delete ${fileName}?`)
  if(ok) window.location.href = '/delete/' + fileName
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', async (e) => {
      const filePath = button.dataset.path
      const confirmed = confirm('Delete this file?')
      if (!confirmed) return

      try {
        const res = await fetch(`/delete/${filePath}`, { method: 'DELETE' })
        if (res.ok) {
          location.reload()
        } else {
          alert('Failed to delete file.')
        }
      } catch (err) {
        console.error(err)
        alert('Error deleting file.')
      }
    })
  })
})
