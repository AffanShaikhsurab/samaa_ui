import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ConversationHeader extends StatelessWidget {
  final String avatarText;
  final String title;
  final String subtitle;
  final String metaLabel;
  final VoidCallback? onBack;
  final VoidCallback? onCall;
  final VoidCallback? onVideo;
  final VoidCallback? onInfo;

  const ConversationHeader({Key? key, required this.avatarText, required this.title, required this.subtitle, this.metaLabel = 'Active now', this.onBack = null, this.onCall = null, this.onVideo = null, this.onInfo = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        InkWell(
          onTap: onBack,
          child: Icon(
            LucideIcons.arrowLeft,
            color: Colors.white,
            size: 22,
          ),
        ),
        SizedBox(width: 12),
        CircleAvatar(
          child: Text(
            avatarText.isNotEmpty ? avatarText[0].toUpperCase() : 'P',
            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
          ),
          radius: 16,
          backgroundColor: Color(0xFF262626),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Text(
                    title.toString(),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  SizedBox(width: 6),
                  Icon(
                    LucideIcons.chevronDown,
                    color: Color(0xFF8E8E8E),
                    size: 14,
                  ),
                ],
              ),
              SizedBox(height: 2),
              Text(
                subtitle.toString(),
                style: const TextStyle(fontSize: 12, color: Color(0xFF8E8E8E)),
              ),
            ],
          ),
        ),
        SizedBox(width: 12),
        InkWell(
          onTap: onCall,
          child: Icon(
            LucideIcons.phone,
            color: Colors.white,
            size: 20,
          ),
        ),
        SizedBox(width: 12),
        InkWell(
          onTap: onVideo,
          child: Icon(
            LucideIcons.video,
            color: Colors.white,
            size: 20,
          ),
        ),
        SizedBox(width: 12),
        InkWell(
          onTap: onInfo,
          child: Icon(
            LucideIcons.info,
            color: Colors.white,
            size: 20,
          ),
        ),
      ],
    );
  }
}
