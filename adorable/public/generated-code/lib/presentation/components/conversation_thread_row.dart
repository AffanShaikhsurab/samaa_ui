import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ConversationThreadRow extends StatelessWidget {
  final String avatarText;
  final String title;
  final String subtitle;
  final String timeLabel;
  final bool hasStory;
  final bool unread;
  final bool showCameraAction;
  final VoidCallback? onTap;
  final VoidCallback? onAction;

  const ConversationThreadRow({
    Key? key,
    required this.avatarText,
    required this.title,
    required this.subtitle,
    required this.timeLabel,
    this.hasStory = false,
    this.unread = false,
    this.showCameraAction = true,
    this.onTap,
    this.onAction,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  if (hasStory)
                    Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF97316),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: CircleAvatar(
                        radius: 26,
                        backgroundColor: const Color(0xFF1C1C1E),
                        child: Text(
                          avatarText.isNotEmpty
                              ? avatarText[0].toUpperCase()
                              : 'P',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  if (!hasStory)
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: const Color(0xFF262626),
                      child: Text(
                        avatarText.isNotEmpty
                            ? avatarText[0].toUpperCase()
                            : 'P',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                subtitle,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF8E8E8E),
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              timeLabel,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF8E8E8E),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            if (unread)
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            if (!unread && showCameraAction)
              InkWell(
                onTap: onAction,
                child: const Icon(
                  LucideIcons.camera,
                  color: Colors.white,
                  size: 20,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
