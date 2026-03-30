import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'privacy_state_badge.dart';

class ProfileIdentityHeader extends StatelessWidget {
  final String avatarText;
  final String displayName;
  final String username;
  final String bio;
  final String linkLabel;
  final String subtitle;
  final bool isVerified;
  final bool isPrivate;
  final VoidCallback? onAvatarTap;
  final VoidCallback? onLinkTap;

  const ProfileIdentityHeader({Key? key, required this.avatarText, required this.displayName, required this.username, required this.bio, this.linkLabel = '', this.subtitle = '', this.isVerified = false, this.isPrivate = false, this.onAvatarTap = null, this.onLinkTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(28), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              InkWell(
                onTap: onAvatarTap,
                child: CircleAvatar(
                  child: Text(
                    avatarText.isNotEmpty ? avatarText[0].toUpperCase() : 'P',
                    style: TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w800),
                  ),
                  radius: 42,
                  backgroundColor: Color(0xFF2563EB),
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: <Widget>[
                        Text(
                          displayName.toString(),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
                        ),
                        SizedBox(width: 8),
                        if (isVerified) Icon(
                          LucideIcons.badgeCheck,
                          color: Color(0xFF60A5FA),
                          size: 18,
                        ),
                        SizedBox(width: 8),
                        if (isPrivate) PrivacyStateBadge(label: 'Private profile'),
                      ],
                    ),
                    SizedBox(height: 6),
                    Text(
                      username.toString(),
                      style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                    SizedBox(height: 6),
                    if (subtitle.isNotEmpty) Text(
                      subtitle.toString(),
                      style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: 14),
          Text(
            bio.toString(),
            style: const TextStyle(fontSize: 14, color: Color(0xFF111827)),
          ),
          SizedBox(height: 14),
          if (linkLabel.isNotEmpty) InkWell(
            onTap: onLinkTap,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                Icon(
                  LucideIcons.link,
                  color: Color(0xFF93C5FD),
                  size: 14,
                ),
                SizedBox(width: 8),
                Text(
                  linkLabel.toString(),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
