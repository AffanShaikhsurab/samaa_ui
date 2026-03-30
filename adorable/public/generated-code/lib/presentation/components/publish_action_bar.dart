import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class _GeneratedAttachment {
  final String id;
  final String name;
  final String type;
  final String mimeType;
  final String content;

  const _GeneratedAttachment({required this.id, required this.name, required this.type, required this.mimeType, required this.content});

  bool isImage() {
    return type == 'image';
  }

  bool isText() {
    return type == 'text';
  }
}

class _GeneratedFilePickerButton extends StatefulWidget {
  final String label;
  final ValueChanged<_GeneratedAttachment>? onPicked;

  const _GeneratedFilePickerButton({Key? key, required this.label, this.onPicked})
    : super(key: key)
;

  @override
  State<_GeneratedFilePickerButton> createState() {
    return _GeneratedFilePickerButtonState();
  }
}

class _GeneratedFilePickerButtonState extends State<_GeneratedFilePickerButton> {
  bool _isPicking = false;

  Future<void> _handlePick() async {
    if (_isPicking) return;
    setState(() { _isPicking = true; });
    try {
      final result = await FilePicker.platform.pickFiles(
        allowMultiple: false,
        type: FileType.custom,
        allowedExtensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'txt', 'md', 'html', 'css', 'js', 'ts', 'dart', 'py', 'json', 'yaml', 'yml', 'xml', 'csv'],
        withData: true,
      );
      if (result == null || result.files.isEmpty) return;
      final file = result.files.first;
      final bytes = file.bytes;
      if (bytes == null) return;
      final imageExtensions = <String>{'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'};
      final ext = file.name.contains('.') ? file.name.split('.').last.toLowerCase() : '';
      final isImage = imageExtensions.contains(ext);
      final mimeType = switch (ext) {
        'png' => 'image/png',
        'jpg' || 'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
        'bmp' => 'image/bmp',
        'html' => 'text/html',
        'css' => 'text/css',
        'js' || 'ts' => 'text/javascript',
        'json' => 'application/json',
        'md' => 'text/markdown',
        _ => 'text/plain',
      };
      final attachment = _GeneratedAttachment(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: file.name,
        type: isImage ? 'image' : 'text',
        mimeType: mimeType,
        content: isImage ? 'data:$mimeType;base64,${base64Encode(bytes)}' : utf8.decode(bytes, allowMalformed: true),
      );
      widget.onPicked?.call(attachment);
    } finally {
      if (mounted) {
        setState(() { _isPicking = false; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: _isPicking ? null : _handlePick,
      icon: _isPicking ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 1.5)) : Icon(LucideIcons.plus),
      label: Text(widget.label),
    );
  }
}

class PublishActionBar extends StatelessWidget {
  final String primaryLabel;
  final String secondaryLabel;
  final String statusText;
  final bool isPublishing;
  final ValueChanged<dynamic>? onPick;
  final VoidCallback? onSecondary;

  const PublishActionBar({Key? key, this.primaryLabel = 'Select media', this.secondaryLabel = 'Publish', this.statusText = '', this.isPublishing = false, this.onPick = null, this.onSecondary = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (statusText.isNotEmpty) Text(
          statusText.toString(),
          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
        ),
        SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            _GeneratedFilePickerButton(
              label: primaryLabel.toString(),
              onPicked: (_GeneratedAttachment attachment) {
                final _callback = onPick;
                if (_callback != null) {
                  _callback.call(attachment);
                }
              },
            ),
            SizedBox(width: 12),
            if (isPublishing) ElevatedButton(
              onPressed: null,
              style: ElevatedButton.styleFrom(backgroundColor: Color(0xFF1E293B), foregroundColor: Color(0xFFCBD5E1), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              child: Text('Publishing...'),
            ),
            if (!(isPublishing)) ElevatedButton(
              onPressed: onSecondary,
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              child: Text(secondaryLabel.toString()),
            ),
          ],
        ),
      ],
    );
  }
}
