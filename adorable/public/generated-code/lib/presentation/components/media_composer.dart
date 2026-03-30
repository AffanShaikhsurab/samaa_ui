import 'package:flutter/material.dart';

import 'post_draft_preview.dart';
import 'publish_action_bar.dart';
import 'section_header.dart';

class MediaComposer extends StatelessWidget {
  final String title;
  final String subtitle;
  final String primaryLabel;
  final String selectedLabel;
  final String draftCaption;
  final String captionPlaceholder;
  final String secondaryLabel;
  final String statusText;
  final bool isPublishing;
  final ValueChanged<dynamic>? onPick;
  final ValueChanged<dynamic>? onCaptionChanged;
  final VoidCallback? onSecondary;

  const MediaComposer({Key? key, required this.title, required this.subtitle, this.primaryLabel = 'Select media', this.selectedLabel = 'No media selected yet', this.draftCaption = '', this.captionPlaceholder = 'Write a caption', this.secondaryLabel = 'Publish', this.statusText = '', this.isPublishing = false, this.onPick = null, this.onCaptionChanged = null, this.onSecondary = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(24),
      decoration: BoxDecoration(color: Color(0xFF0F172A), borderRadius: BorderRadius.circular(28), border: Border.all(color: Color(0xFF1E293B), width: 1)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SectionHeader(
            title: title,
            subtitle: subtitle,
          ),
          SizedBox(height: 18),
          PostDraftPreview(selectedLabel: selectedLabel),
          SizedBox(height: 18),
          TextFormField(
            decoration: InputDecoration(hintText: captionPlaceholder),
            initialValue: draftCaption,
            onChanged: (dynamic value) {
              final _callback = onCaptionChanged;
              if (_callback != null) {
                _callback.call(value);
              }
            },
          ),
          SizedBox(height: 18),
          PublishActionBar(
            primaryLabel: primaryLabel,
            secondaryLabel: secondaryLabel,
            statusText: statusText,
            isPublishing: isPublishing,
            onPick: onPick,
            onSecondary: onSecondary,
          ),
        ],
      ),
    );
  }
}
