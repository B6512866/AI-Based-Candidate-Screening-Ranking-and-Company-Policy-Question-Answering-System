package services

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

// SupabaseStorageService handles file uploads to Supabase Storage.
// Files are stored permanently in the cloud so they survive Render restarts.
type SupabaseStorageService struct {
	projectURL string
	serviceKey string
	bucket     string
	httpClient *http.Client
}

func NewSupabaseStorageService(projectURL, serviceKey, bucket string) *SupabaseStorageService {
	return &SupabaseStorageService{
		projectURL: strings.TrimRight(projectURL, "/"),
		serviceKey: serviceKey,
		bucket:     bucket,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

// UploadFile uploads a file to Supabase Storage and returns the public URL.
// objectPath is the path within the bucket, e.g. "resumes/1234567890.pdf"
func (s *SupabaseStorageService) UploadFile(fileBytes []byte, originalFilename string, contentType string) (string, error) {
	ext := filepath.Ext(originalFilename)
	objectName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	objectPath := objectName

	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.projectURL, s.bucket, objectPath)

	req, err := http.NewRequest("POST", uploadURL, bytes.NewReader(fileBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	if contentType == "" {
		contentType = detectContentType(originalFilename, fileBytes)
	}

	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true") // overwrite if same name exists

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("supabase storage upload failed (HTTP %d): %s", resp.StatusCode, string(body))
	}

	// Return the public URL for the uploaded file
	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.projectURL, s.bucket, objectPath)
	return publicURL, nil
}

// UploadFileHeader uploads a multipart file header to Supabase Storage.
func (s *SupabaseStorageService) UploadFileHeader(fileHeader *multipart.FileHeader) (string, error) {
	f, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	fileBytes, err := io.ReadAll(f)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	ct := fileHeader.Header.Get("Content-Type")
	return s.UploadFile(fileBytes, fileHeader.Filename, ct)
}

// DeleteFile deletes a file from Supabase Storage by its public URL.
func (s *SupabaseStorageService) DeleteFile(publicURL string) error {
	// Extract object path from public URL
	// URL format: {projectURL}/storage/v1/object/public/{bucket}/{objectPath}
	prefix := fmt.Sprintf("%s/storage/v1/object/public/%s/", s.projectURL, s.bucket)
	objectPath := strings.TrimPrefix(publicURL, prefix)
	if objectPath == publicURL || objectPath == "" {
		return nil // not a Supabase Storage URL, skip
	}

	deleteURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.projectURL, s.bucket, objectPath)

	req, err := http.NewRequest("DELETE", deleteURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete request failed: %w", err)
	}
	defer resp.Body.Close()

	return nil
}

// IsSupabaseURL returns true if the given URL is a Supabase Storage URL.
func (s *SupabaseStorageService) IsSupabaseURL(url string) bool {
	return strings.Contains(url, s.projectURL) && strings.Contains(url, "/storage/v1/object/public/")
}

func detectContentType(filename string, data []byte) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".pdf":
		return "application/pdf"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	case ".txt":
		return "text/plain"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}
	// Fallback to http.DetectContentType
	if len(data) > 0 {
		return http.DetectContentType(data)
	}
	return "application/octet-stream"
}
